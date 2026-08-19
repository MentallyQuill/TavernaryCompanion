import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { InstalledSectionViewModel } from "../../src/catalog/installed-view-model";
import { InstalledRoute } from "../../src/ui/installed/installed-route";

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
      },
    ],
  },
  { id: "attention", title: "Needs attention", rows: [] },
];

describe("InstalledRoute", () => {
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

  it("renders installed Kits before extension cards and toggles an extension in place", () => {
    const onToggleExtension = vi.fn();
    const onOpenKit = vi.fn();
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
            orphaned: false,
          },
        ]}
        activeKitId="writer-kit"
        onRefresh={vi.fn()}
        onOpenKit={onOpenKit}
        onToggleExtension={onToggleExtension}
      />,
    );

    expect(screen.getByRole("heading", { name: "Installed Kits" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Writer Kit" })).toBeVisible();
    expect(screen.getByText("Active Kit")).toBeVisible();
    expect(screen.getByText("In Writer Kit")).toBeVisible();
    expect(container.querySelectorAll(".tavernary-companion-installed-card")).toHaveLength(3);
    const toggle = screen.getByRole("switch", { name: "Disable Alpha" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(onToggleExtension).toHaveBeenCalledWith("alpha", "third-party/Alpha", false);
    fireEvent.click(screen.getByRole("button", { name: "Open Writer Kit" }));
    expect(onOpenKit).toHaveBeenCalledWith("writer-kit");
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
            orphaned: true,
          },
        ]}
        onRefresh={vi.fn()}
        onUninstallKit={onUninstallKit}
      />,
    );

    expect(screen.getByRole("heading", { name: "removed-kit" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Uninstall removed-kit" }));
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
