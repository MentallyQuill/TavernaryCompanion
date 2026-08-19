import { fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanionShell } from "../../src/ui/shell/companion-shell";
import { createShellController } from "../../src/ui/shell/shell-controller";
import { createKitDiscoveryController } from "../../src/kits/kit-discovery-controller";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import { createDiscoveryController } from "../../src/catalog/discovery-controller";
import type { InventorySnapshot } from "../../src/inventory/inventory-types";

const emptyInventory: InventorySnapshot = {
  managed: [],
  external: [],
  unknown: [],
  missingManaged: [],
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("CompanionShell", () => {
  it("renders semantic routes and restores the active route from state", () => {
    const controller = createShellController({ initialRoute: "installed" });
    render(<CompanionShell controller={controller} />);

    expect(screen.getByRole("heading", { name: "Tavernary Companion" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Tavernary" })).toBeVisible();
    expect(screen.getByText("Where AI roleplay tools gather")).toBeVisible();
    expect(screen.getByText("Companion", { selector: "span" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Catalog categories" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Installed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("main")).toHaveTextContent("Installed extensions");
  });

  it("keeps project search in the shared header", () => {
    const catalog = catalogFixture();
    catalog.projects = [catalogProjectFixture()];
    const discovery = createDiscoveryController({
      snapshot: {
        state: "ready-current",
        canMutate: true,
        checkedAt: null,
        catalog,
      },
      inventory: emptyInventory,
    });
    render(
      <CompanionShell
        controller={createShellController({ initialRoute: "projects" })}
        discovery={discovery}
      />,
    );

    const header = document.querySelector<HTMLElement>(".tavernary-companion-shell__header");
    expect(header).not.toBeNull();
    const search = within(header!).getByRole("searchbox", { name: "Search projects" });
    fireEvent.input(search, { target: { value: "memory" } });

    expect(discovery.read().query.search).toBe("memory");
  });

  it("starts Kit selection from the card plus and selects that project immediately", () => {
    const catalog = catalogFixture();
    const project = catalogProjectFixture();
    project.name = "SillyTavern Alpha";
    catalog.projects = [project];
    const discovery = createDiscoveryController({
      snapshot: {
        state: "ready-current",
        canMutate: true,
        checkedAt: null,
        catalog,
      },
      inventory: emptyInventory,
    });
    render(
      <CompanionShell
        controller={createShellController({ initialRoute: "projects" })}
        discovery={discovery}
      />,
    );

    expect(screen.queryByRole("button", { name: "Select for Kit" })).not.toBeInTheDocument();
    const add = screen.getByRole("button", { name: "Add Alpha to Kit" });
    expect(add.querySelector('svg[data-kit-glyph="add"]')).not.toBeNull();
    expect(within(add).getByText("Kit")).toBeVisible();
    fireEvent.click(add);

    expect(screen.getByText("1 selected")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Remove Alpha from selection" }));
    expect(screen.getByText("0 selected")).toBeVisible();
  });

  it("navigates primary routes with the compact Browse menu", () => {
    render(<CompanionShell controller={createShellController({ initialRoute: "projects" })} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Browse categories" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Browse categories menu" })).getByRole("button", {
        name: "Kits",
      }),
    );

    expect(screen.getByRole("heading", { name: "Kits" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "Browse categories menu" })).not.toBeInTheDocument();
  });

  it("uses one browser Back event for the top detail and preserves the popup", () => {
    const controller = createShellController({ initialRoute: "kits" });
    controller.openDetail({ kind: "kit", id: "alpha", focusKey: "kit-alpha" });
    render(<CompanionShell controller={controller} />);
    expect(screen.getByRole("button", { name: "Back" })).toBeVisible();

    fireEvent(window, new PopStateEvent("popstate"));

    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tavernary Companion" })).toBeVisible();
  });

  it("dispatches the close intent", () => {
    const onRequestClose = vi.fn();
    const controller = createShellController({ initialRoute: "projects" });
    render(<CompanionShell controller={controller} onRequestClose={onRequestClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close Tavernary Companion" }));

    expect(onRequestClose).toHaveBeenCalledOnce();
  });

  it.each([
    [{ state: "error-empty", canMutate: false, checkedAt: null, error: "offline" }, "Try again"],
    [
      {
        state: "incompatible-empty",
        canMutate: false,
        checkedAt: null,
        remoteSchemaVersion: 8,
      },
      "Update Companion",
    ],
  ] as Array<[CatalogSnapshot, string]>)(
    "keeps header refresh out of the %s catalog boundary",
    (catalogSnapshot, boundaryAction) => {
      render(
        <CompanionShell
          controller={createShellController({ initialRoute: "projects" })}
          catalogSnapshot={catalogSnapshot}
          onRefreshCatalog={vi.fn()}
        />,
      );

      expect(screen.getAllByRole("button", { name: boundaryAction })).toHaveLength(1);
      expect(screen.queryByRole("button", { name: "Refresh catalog" })).not.toBeInTheDocument();
    },
  );

  it("opens the Kit inspector for Review and View Kit card actions", () => {
    const controller = createShellController({ initialRoute: "kits" });
    const project = catalogProjectFixture();
    const inspector = {
      id: "changed",
      title: "Changed Kit",
      description: "Review changes",
      origin: "published" as const,
      originLabel: "Published Kit" as const,
      componentCount: 1,
      flaggedCount: 0,
      operationalStatus: "Changed on Tavernary",
      primaryAction: { kind: "review" as const, label: "Review" as const },
      editable: false,
      components: [],
    };
    const kitDiscovery = createKitDiscoveryController({
      catalog: {
        ...catalogFixture(),
        kits: [
          {
            id: "changed",
            title: "Changed Kit",
            description: "Review changes",
            author: { githubUserId: 1, login: "author" },
            sourceIssueNumber: 1,
            sourceIssueUrl: "https://example.com/issues/1",
            publishedAt: "2026-08-18T00:00:00.000Z",
            updatedAt: "2026-08-18T00:00:00.000Z",
            frontends: [{ id: "sillytavern", label: "SillyTavern", description: "SillyTavern" }],
            purposes: [],
            modelFamilies: [],
            components: [
              {
                projectId: project.id,
                name: project.name,
                kind: project.kind,
                primaryFunction: project.primaryFunction,
                availability: "available",
                unavailableReason: null,
                canonicalUrl: project.canonicalUrl,
                project,
              },
            ],
            supporterCount: null,
            trendingScore: null,
            supportRefreshedAt: null,
            supportStale: false,
            flaggedProjectCount: 0,
            search: {
              title: ["changed"],
              aliases: [],
              source: [],
              summary: [],
              kind: [],
              primaryFunction: [],
              tags: [],
              frontends: [],
              compatibility: [],
              maintainers: [],
              relationships: [],
            },
          },
        ],
      },
      personal: [],
      statuses: new Map([["changed", "changedOnTavernary"]]),
    });
    kitDiscovery.setQuery({ ...kitDiscovery.read().query, minProjects: 0 });
    render(
      <CompanionShell
        controller={controller}
        kitDiscovery={kitDiscovery}
        kitInspectors={{ changed: inspector }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByRole("heading", { name: "Changed Kit" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Back" })).toBeVisible();
  });
});
