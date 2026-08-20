import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { InstalledSectionViewModel } from "../../src/catalog/installed-view-model";
import { InstalledRoute } from "../../src/ui/installed/installed-route";
import type { ProjectUpdateState } from "../../src/updates/update-coordinator";

afterEach(() => document.body.replaceChildren());

const sections: InstalledSectionViewModel[] = [
  {
    id: "managed",
    title: "Managed by Companion",
    rows: [
      {
        id: "alpha",
        name: "Alpha",
        detail: "Alpha",
        internalName: "third-party/Alpha",
        canonicalUrl: "https://example.test/alpha",
        enabled: true,
        toggleable: true,
        action: { kind: "uninstall", label: "Uninstall", reason: "Managed by Companion" },
        selectionEligible: true,
        selectionDisabledReason: null,
      },
    ],
  },
  { id: "external", title: "Installed outside Companion", rows: [] },
  {
    id: "unknown",
    title: "Not found in current catalog",
    rows: [
      {
        id: "third-party/Mystery",
        name: "Mystery",
        detail: "third-party/Mystery",
        internalName: "third-party/Mystery",
        canonicalUrl: null,
        enabled: false,
        toggleable: true,
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "No unambiguous Tavernary project identity.",
        },
        selectionEligible: false,
        selectionDisabledReason: "No unambiguous Tavernary project identity.",
      },
    ],
  },
];

describe("InstalledRoute", () => {
  it("presents unresolved inventory as loading instead of confirmed empty", () => {
    render(
      <InstalledRoute
        sections={sections.map((section) => ({ ...section, rows: [] }))}
        loadState="loading"
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading installed extensions…");
    expect(screen.queryByText("0 installed extensions")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No installed extensions were found in this profile."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check for updates" })).toBeDisabled();
  });

  it("presents a failed initial discovery as unavailable instead of confirmed empty", () => {
    render(
      <InstalledRoute
        sections={sections.map((section) => ({ ...section, rows: [] }))}
        loadState="error"
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("Installed extensions unavailable")).toBeVisible();
    expect(screen.queryByText("0 installed extensions")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No installed extensions were found in this profile."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check for updates" })).toBeDisabled();
  });

  it("selects an eligible extension by clicking its card without a selection-mode button", () => {
    const onToggleSelection = vi.fn();
    const { container } = render(
      <InstalledRoute
        sections={sections}
        onRefresh={vi.fn()}
        onToggleSelection={onToggleSelection}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Select installed extensions" }),
    ).not.toBeInTheDocument();
    const alphaCard = container.querySelector<HTMLElement>(
      ".tavernary-companion-installed-card.is-installed",
    );
    expect(alphaCard).not.toBeNull();
    expect(within(alphaCard!).queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(within(alphaCard!).getByRole("button", { name: "Select Alpha" }));
    expect(onToggleSelection).toHaveBeenCalledWith("alpha");
  });

  it("keeps card controls independent from card selection", () => {
    const onToggleSelection = vi.fn();
    const onToggleExtension = vi.fn();
    render(
      <InstalledRoute
        sections={sections}
        onRefresh={vi.fn()}
        onToggleSelection={onToggleSelection}
        onToggleExtension={onToggleExtension}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("switch", { name: "Disable Alpha" }));
    expect(onToggleSelection).not.toHaveBeenCalled();
    expect(onToggleExtension).toHaveBeenCalledWith("alpha", "third-party/Alpha", false);
  });

  it("renders selected extension cards and the approved bulk actions", () => {
    const onToggleSelection = vi.fn();
    const onAddSelectedToKit = vi.fn();
    const onUninstallSelected = vi.fn();
    const onClearSelection = vi.fn();
    render(
      <InstalledRoute
        sections={sections}
        selection={{ active: true, projectIds: ["alpha"], sourceKitIds: [] }}
        onRefresh={vi.fn()}
        onToggleSelection={onToggleSelection}
        onAddSelectedToKit={onAddSelectedToKit}
        onUninstallSelected={onUninstallSelected}
        onClearSelection={onClearSelection}
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    const alpha = screen.getByRole("button", { name: "Deselect Alpha" });
    expect(alpha).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("1 selected");
    const bulkBar = screen.getByRole("complementary", { name: "Bulk actions" });
    expect(bulkBar).toHaveClass("tavernary-companion-kit-selection-dock");
    expect(screen.getByRole("button", { name: "Add selected extensions to a Kit" })).toHaveClass(
      "tavernary-companion-kit-selection-add",
    );
    expect(bulkBar.querySelector(".selection-count")).toHaveTextContent("1");
    fireEvent.click(alpha);
    fireEvent.click(screen.getByRole("button", { name: "Add selected extensions to a Kit" }));
    fireEvent.click(screen.getByRole("button", { name: "Uninstall selected extensions" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear selection and exit" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onToggleSelection).toHaveBeenCalledWith("alpha");
    expect(onAddSelectedToKit).toHaveBeenCalledOnce();
    expect(onUninstallSelected).toHaveBeenCalledOnce();
    expect(onClearSelection).toHaveBeenCalledTimes(2);
  });

  it("collapses empty inventory sections and refreshes host inventory on entry", async () => {
    const onRefresh = vi.fn();
    render(<InstalledRoute sections={sections} onRefresh={onRefresh} />);

    expect(screen.getByRole("heading", { name: "Managed by Companion" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Installed outside Companion" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Not found in current catalog" })).toBeVisible();
    expect(screen.getByText("2 installed extensions")).toBeVisible();
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });

  it("gives unknown extensions only the SillyTavern management handoff", () => {
    const onManage = vi.fn();
    render(<InstalledRoute sections={sections} onRefresh={vi.fn()} onManage={onManage} />);

    fireEvent.click(screen.getByRole("button", { name: "Manage Mystery in SillyTavern" }));
    expect(onManage).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /View Mystery/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Uninstall Mystery/ })).not.toBeInTheDocument();
  });

  it("keeps the last inventory visible while rediscovery is running", () => {
    render(<InstalledRoute sections={sections} refreshing onRefresh={vi.fn()} />);
    expect(screen.getByText("Updating installed extensions…")).toBeVisible();
    expect(screen.getAllByText("Alpha")[0]).toBeVisible();
  });

  it("shows an available update immediately before uninstall", () => {
    const onUpdate = vi.fn();
    const updateStates: Record<string, ProjectUpdateState> = {
      alpha: { kind: "available", notice: null, targets: [] },
    };
    const { container } = render(
      <InstalledRoute
        sections={sections}
        updateStates={updateStates}
        onRefresh={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByText("Update available")).toBeVisible();
    const update = screen.getByRole("button", { name: "Update Alpha" });
    const uninstall = screen.getByRole("button", { name: "Uninstall Alpha" });
    const actions = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.tavernary-companion-installed-card footer button[aria-label="Update Alpha"], .tavernary-companion-installed-card footer button[aria-label="Uninstall Alpha"]',
      ),
    );
    expect(actions).toEqual([update, uninstall]);
    fireEvent.click(update);
    expect(onUpdate).toHaveBeenCalledWith("alpha", update);
  });

  it("reports current extensions without an inactive update button", () => {
    render(
      <InstalledRoute
        sections={sections}
        updateStates={{ alpha: { kind: "current" } }}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("Latest")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Update Alpha" })).not.toBeInTheDocument();
  });

  it("marks the installed scan as latest scanned when a newer version is available", () => {
    render(
      <InstalledRoute
        sections={sections}
        updateStates={{
          alpha: {
            kind: "available",
            notice: "You already have the latest scanned version.",
            targets: [{ kind: "newest", requestedSha: null, resolvedAt: null }],
          },
        }}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("Latest scanned")).toBeVisible();
    expect(screen.queryByText("Update available")).not.toBeInTheDocument();
  });

  it("explains native newest-only updates once without marking extensions as attention", () => {
    render(
      <InstalledRoute
        sections={sections}
        updateStates={{ alpha: { kind: "current", native: true } }}
        onRefresh={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "SillyTavern can update extensions to the latest version from their creator. Updating to a specific TavernKeeper-scanned version isn’t supported by this build.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Needs attention")).not.toBeInTheDocument();
  });

  it("offers a per-extension retry after a failed check", () => {
    const onRetryUpdate = vi.fn();
    render(
      <InstalledRoute
        sections={sections}
        updateStates={{
          alpha: {
            kind: "error",
            reason:
              "Companion couldn’t check this extension. Try again; if it still fails, open it in SillyTavern.",
          },
        }}
        onRefresh={vi.fn()}
        onRetryUpdate={onRetryUpdate}
      />,
    );

    expect(screen.getByText("Could not check")).toBeVisible();
    expect(
      screen.getByText(
        "Companion couldn’t check this extension. Try again; if it still fails, open it in SillyTavern.",
      ),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry updates for Alpha" }));
    expect(onRetryUpdate).toHaveBeenCalledWith("alpha");
  });

  it("offers a manual update check for all installed extensions", () => {
    const onCheckUpdates = vi.fn();
    render(
      <InstalledRoute
        sections={sections}
        updateStates={{ alpha: { kind: "current" } }}
        onRefresh={vi.fn()}
        onCheckUpdates={onCheckUpdates}
      />,
    );

    const button = screen.getByRole("button", { name: "Check for updates" });
    fireEvent.click(button);
    expect(onCheckUpdates).toHaveBeenCalledOnce();
  });

  it("disables update checks while another lifecycle operation is active", () => {
    render(
      <InstalledRoute
        sections={sections}
        updateStates={{ alpha: { kind: "current" } }}
        lifecycleDisabled
        onRefresh={vi.fn()}
        onCheckUpdates={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Check for updates" })).toBeDisabled();
  });

  it("shows the attention reason and a SillyTavern handoff", () => {
    const onManage = vi.fn();
    render(
      <InstalledRoute
        sections={sections}
        updateStates={{
          alpha: {
            kind: "attention",
            reason: "This extension has local changes. Manage it in SillyTavern.",
          },
        }}
        onRefresh={vi.fn()}
        onManage={onManage}
      />,
    );

    expect(
      screen.getByText("This extension has local changes. Manage it in SillyTavern."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Manage Alpha in SillyTavern" }));
    expect(onManage).toHaveBeenCalledOnce();
  });

  it("links cataloged installed projects directly to their canonical source", () => {
    render(<InstalledRoute sections={sections} onRefresh={vi.fn()} />);

    const source = screen.getByRole("link", { name: "Alpha" });
    expect(source).toHaveAttribute("href", "https://example.test/alpha");
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.queryByRole("button", { name: "View Alpha" })).not.toBeInTheDocument();
  });

  it("omits duplicate inventory details from condensed extension cards", () => {
    render(<InstalledRoute sections={sections} onRefresh={vi.fn()} />);

    expect(screen.getAllByText("Alpha")).toHaveLength(1);
    expect(screen.queryByText("third-party/Mystery")).not.toBeInTheDocument();
  });

  it("reserves the extension card corner for version status", () => {
    const { container } = render(<InstalledRoute sections={sections} onRefresh={vi.fn()} />);

    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(".tavernary-companion-installed-card"),
    );
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.querySelector(":scope > header > strong")).toBeNull();
    }
    expect(screen.getByRole("switch", { name: "Disable Alpha" })).toHaveTextContent("Enabled");
    expect(screen.getByRole("switch", { name: "Enable Mystery" })).toHaveTextContent("Disabled");
  });

  it("renders installed Kits before extension cards and toggles an extension in place", () => {
    const onToggleExtension = vi.fn();
    const onSelectKit = vi.fn();
    const { container } = render(
      <InstalledRoute
        sections={sections}
        kits={[
          {
            id: "writer-kit",
            title: "Writer Kit",
            description: "A focused writing stack.",
            originLabel: "Personal Kit",
            operationalStatus: "Active",
            components: [
              {
                projectId: "alpha",
                name: "Alpha",
              },
            ],
            installedProjectIds: ["alpha"],
            missingProjectIds: [],
            selectionProjectIds: ["alpha"],
            installedCount: 1,
            totalProjectCount: 1,
            displayStatus: "Active",
            statusHelp:
              "This Kit currently defines the enabled state for Companion-managed extensions.",
            active: true,
            orphaned: false,
          },
        ]}
        activeKitId="writer-kit"
        onRefresh={vi.fn()}
        onSelectKit={onSelectKit}
        onToggleExtension={onToggleExtension}
      />,
    );

    expect(screen.getByRole("heading", { name: "Installed Kits" })).toBeVisible();
    const kit = screen.getByRole("button", {
      name: "Select 1 installed extension from Writer Kit",
    });
    expect(screen.getByText("1/1 installed")).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.queryByText("A focused writing stack.")).not.toBeInTheDocument();
    expect(screen.getByText("In Writer Kit")).toBeVisible();
    expect(container.querySelectorAll(".tavernary-companion-installed-card")).toHaveLength(2);
    const toggle = screen.getByRole("switch", { name: "Disable Alpha" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(onToggleExtension).toHaveBeenCalledWith("alpha", "third-party/Alpha", false);
    fireEvent.click(kit);
    expect(onSelectKit).toHaveBeenCalledWith("writer-kit");
  });

  it("keeps an orphaned installed Kit visible with an uninstall path", () => {
    const onUninstallKit = vi.fn();
    render(
      <InstalledRoute
        sections={sections.map((section) => ({ ...section, rows: [] }))}
        kits={[
          {
            id: "removed-kit",
            title: "removed-kit",
            description: "No longer cataloged.",
            originLabel: "Installed Kit",
            operationalStatus: "Installed",
            components: [{ projectId: "alpha", name: "Alpha" }],
            installedProjectIds: ["alpha"],
            missingProjectIds: [],
            selectionProjectIds: ["alpha"],
            installedCount: 1,
            totalProjectCount: 1,
            displayStatus: "Complete",
            statusHelp: "Every extension in this Kit is currently installed.",
            active: false,
            orphaned: true,
          },
        ]}
        onRefresh={vi.fn()}
        onUninstallKit={onUninstallKit}
      />,
    );

    expect(screen.getByRole("heading", { name: "removed-kit" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "More actions for removed-kit" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Uninstall Kit" }));
    expect(onUninstallKit).toHaveBeenCalledWith("removed-kit");
  });

  it("explains an inventory with no installed extensions", () => {
    render(
      <InstalledRoute
        sections={sections.map((section) => ({ ...section, rows: [] }))}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("No installed extensions were found in this profile.")).toBeVisible();
  });
});
