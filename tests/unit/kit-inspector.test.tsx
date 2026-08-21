import { fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";
import { KitInspector } from "../../src/ui/kits/kit-inspector";

afterEach(() => document.body.replaceChildren());

it("groups Kit components and offers copy for published Kits", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "published",
        originLabel: "Published Kit",
        componentCount: 2,
        flaggedCount: 0,
        supporterCount: 4,
        operationalStatus: "Saved",
        primaryAction: { kind: "install", label: "Install Kit" },
        editable: false,
        components: [
          {
            projectId: "alpha",
            name: "Alpha",
            group: "managed",
            available: true,
            assessment: null,
            canonicalUrl: null,
          },
          {
            projectId: "preset",
            name: "Preset",
            group: "context",
            available: true,
            assessment: null,
            canonicalUrl: null,
          },
        ],
      }}
      onAction={() => undefined}
    />,
  );
  expect(screen.getByRole("heading", { name: "Managed/actionable extensions" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Context-only projects" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Copy to Personal Kits" })).toBeVisible();
});

it("offers duplicate and safe removal for saved personal Kits", () => {
  const duplicate = vi.fn();
  const remove = vi.fn();
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "personal",
        originLabel: "Personal Kit",
        componentCount: 0,
        flaggedCount: 0,
        supporterCount: null,
        operationalStatus: "Saved",
        primaryAction: { kind: "install", label: "Install Kit" },
        editable: true,
        components: [],
      }}
      onAction={() => undefined}
      onDuplicate={duplicate}
      onRemove={remove}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "More Kit actions" }));
  fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
  fireEvent.click(screen.getByRole("button", { name: "More Kit actions" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove saved Kit" }));
  expect(duplicate).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledOnce();
});

it("offers removal without uninstalling an installed personal Kit", () => {
  const remove = vi.fn();
  const uninstall = vi.fn();
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "personal",
        originLabel: "Personal Kit",
        componentCount: 1,
        flaggedCount: 0,
        supporterCount: null,
        operationalStatus: "Installed",
        primaryAction: { kind: "activate", label: "Activate" },
        editable: true,
        components: [],
      }}
      onAction={() => undefined}
      onRemove={remove}
      onUninstall={uninstall}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "More Kit actions" }));
  const removeButton = screen.getByRole("button", {
    name: "Remove Kit, keep extensions",
  });
  expect(removeButton).toBeEnabled();
  fireEvent.click(removeButton);
  fireEvent.click(screen.getByRole("button", { name: "Uninstall Kit" }));
  expect(remove).toHaveBeenCalledOnce();
  expect(uninstall).toHaveBeenCalledOnce();
});

it("presents one primary action and separates additional Kit actions", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "personal",
        originLabel: "Personal Kit",
        componentCount: 1,
        flaggedCount: 0,
        supporterCount: null,
        operationalStatus: "Installed",
        primaryAction: { kind: "activate", label: "Activate" },
        editable: true,
        components: [],
      }}
      onAction={() => undefined}
      onEdit={() => undefined}
      onExport={() => undefined}
      onDuplicate={() => undefined}
      onRemove={() => undefined}
      onUninstall={() => undefined}
    />,
  );

  expect(screen.getByRole("button", { name: "Activate" })).toHaveClass(
    "tavernary-companion-button--primary",
  );
  expect(screen.getByRole("button", { name: "Edit" })).toHaveClass(
    "tavernary-companion-button--secondary",
  );
  expect(screen.getByRole("button", { name: "Uninstall Kit" })).toHaveClass(
    "tavernary-companion-button--danger",
  );
  expect(screen.queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();

  const more = screen.getByRole("button", { name: "More Kit actions" });
  expect(more).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(more);

  expect(more).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Export" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Duplicate" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Remove Kit, keep extensions" })).toBeVisible();
});

it("closes additional Kit actions with Escape and restores disclosure focus", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "personal",
        originLabel: "Personal Kit",
        componentCount: 0,
        flaggedCount: 0,
        supporterCount: null,
        operationalStatus: "Saved",
        primaryAction: { kind: "install", label: "Install Kit" },
        editable: true,
        components: [],
      }}
      onAction={() => undefined}
    />,
  );

  const more = screen.getByRole("button", { name: "More Kit actions" });
  fireEvent.click(more);
  const additionalActions = screen.getByRole("group", { name: "Additional Kit actions" });
  fireEvent.keyDown(additionalActions, { key: "Escape" });

  expect(screen.queryByRole("group", { name: "Additional Kit actions" })).not.toBeInTheDocument();
  expect(more).toHaveFocus();
});

it("restores disclosure focus when an additional action is chosen", () => {
  const exportKit = vi.fn();
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "personal",
        originLabel: "Personal Kit",
        componentCount: 0,
        flaggedCount: 0,
        supporterCount: null,
        operationalStatus: "Saved",
        primaryAction: { kind: "install", label: "Install Kit" },
        editable: true,
        components: [],
      }}
      onAction={() => undefined}
      onExport={exportKit}
    />,
  );

  const more = screen.getByRole("button", { name: "More Kit actions" });
  fireEvent.click(more);
  const exportButton = screen.getByRole("button", { name: "Export" });
  exportButton.focus();
  fireEvent.click(exportButton);

  expect(exportKit).toHaveBeenCalledOnce();
  expect(screen.queryByRole("group", { name: "Additional Kit actions" })).not.toBeInTheDocument();
  expect(more).toHaveFocus();
});

it("summarizes Kit membership and availability before the component groups", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Standard 4",
        description: "My standard 4 extensions",
        origin: "personal",
        originLabel: "Personal Kit",
        componentCount: 4,
        flaggedCount: 2,
        supporterCount: null,
        operationalStatus: "Installed",
        primaryAction: { kind: "activate", label: "Activate" },
        editable: true,
        components: [
          {
            projectId: "alpha",
            name: "Alpha",
            group: "managed",
            available: true,
            assessment: "low",
            canonicalUrl: null,
          },
          {
            projectId: "beta",
            name: "Beta",
            group: "managed",
            available: true,
            assessment: "low",
            canonicalUrl: null,
          },
          {
            projectId: "gamma",
            name: "Gamma",
            group: "managed",
            available: true,
            assessment: "low",
            canonicalUrl: null,
          },
          {
            projectId: "delta",
            name: "Delta",
            group: "unavailable",
            available: false,
            assessment: "material",
            canonicalUrl: null,
          },
        ],
      }}
      onAction={() => undefined}
    />,
  );

  const overview = screen.getByRole("region", { name: "Kit overview" });
  expect(within(overview).getByText("4", { selector: "dd" })).toBeVisible();
  expect(within(overview).getByText("3", { selector: "dd" })).toBeVisible();
  expect(within(overview).getByText("2", { selector: "dd" })).toBeVisible();
  expect(within(overview).getByText("Components")).toBeVisible();
  expect(within(overview).getByText("Available")).toBeVisible();
  expect(within(overview).getByText("Needs attention")).toBeVisible();
});

it("gives every component project link a unique accessible name", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "published",
        originLabel: "Published Kit",
        componentCount: 2,
        flaggedCount: 0,
        supporterCount: 4,
        operationalStatus: "Saved",
        primaryAction: { kind: "install", label: "Install Kit" },
        editable: false,
        components: [
          {
            projectId: "alpha",
            name: "Alpha",
            group: "managed",
            available: true,
            assessment: "low",
            canonicalUrl: "https://example.test/alpha",
          },
          {
            projectId: "beta",
            name: "Beta",
            group: "managed",
            available: true,
            assessment: "low",
            canonicalUrl: "https://example.test/beta",
          },
        ],
      }}
      onAction={() => undefined}
    />,
  );

  expect(screen.getByRole("link", { name: "Open Alpha project" })).toHaveAttribute(
    "href",
    "https://example.test/alpha",
  );
  expect(screen.getByRole("link", { name: "Open Beta project" })).toHaveAttribute(
    "href",
    "https://example.test/beta",
  );
  expect(screen.queryByRole("link", { name: "Project" })).not.toBeInTheDocument();
});

it("explains why a component is actionable by Companion", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "personal",
        originLabel: "Personal Kit",
        componentCount: 1,
        flaggedCount: 0,
        supporterCount: null,
        operationalStatus: "Saved",
        primaryAction: { kind: "install", label: "Install Kit" },
        editable: true,
        components: [
          {
            projectId: "alpha",
            name: "Alpha",
            group: "managed",
            available: true,
            assessment: "low",
            canonicalUrl: null,
          },
        ],
      }}
      onAction={() => undefined}
    />,
  );

  expect(screen.getByText("Eligible for Companion Kit actions.")).toBeVisible();
});

it("shows old and current membership while reviewing a published topology change", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "published",
        originLabel: "Published Kit",
        componentCount: 1,
        flaggedCount: 0,
        supporterCount: 4,
        operationalStatus: "Changed on Tavernary",
        primaryAction: { kind: "review", label: "Review" },
        editable: false,
        components: [],
        topologyChange: {
          kind: "exact",
          previousProjectIds: ["alpha", "removed"],
          currentProjectIds: ["alpha", "added"],
          addedProjectIds: ["added"],
          removedProjectIds: ["removed"],
        },
      }}
      onAction={() => undefined}
    />,
  );

  expect(screen.getByRole("heading", { name: "Membership changes" })).toBeVisible();
  expect(screen.getByText("Previously installed: alpha, removed")).toBeVisible();
  expect(screen.getByText("Current Tavernary Kit: alpha, added")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument();
});

it("labels unknown legacy membership without inventing additions or removals", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "published",
        originLabel: "Published Kit",
        componentCount: 1,
        flaggedCount: 0,
        supporterCount: 4,
        operationalStatus: "Changed on Tavernary",
        primaryAction: { kind: "review", label: "Review" },
        editable: false,
        components: [],
        topologyChange: { kind: "unknown", currentProjectIds: ["alpha"] },
      }}
      onAction={() => undefined}
    />,
  );

  expect(
    screen.getByText("Previous membership is unavailable for this legacy install."),
  ).toBeVisible();
  expect(screen.getByText("Current Tavernary Kit: alpha")).toBeVisible();
  expect(screen.queryByText(/^Added:/u)).not.toBeInTheDocument();
  expect(screen.queryByText(/^Removed:/u)).not.toBeInTheDocument();
});
