import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanionShell } from "../../src/ui/shell/companion-shell";
import { createShellController } from "../../src/ui/shell/shell-controller";
import { createKitDiscoveryController } from "../../src/kits/kit-discovery-controller";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";

afterEach(() => {
  document.body.replaceChildren();
});

describe("CompanionShell", () => {
  it("restores the originating card after closing project detail", async () => {
    const controller = createShellController({ initialRoute: "projects" });
    render(<CompanionShell controller={controller} projects={[{ id: "alpha", name: "Alpha" }]} />);
    const card = screen.getByRole("button", { name: "View Alpha" });
    card.focus();
    fireEvent.click(card);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => expect(card).toHaveFocus());
  });

  it("renders semantic routes and restores the active route from state", () => {
    const controller = createShellController({ initialRoute: "installed" });
    render(<CompanionShell controller={controller} />);

    expect(screen.getByRole("heading", { name: "Tavernary Companion" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Companion sections" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Installed" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("main")).toHaveTextContent("Installed extensions");
  });

  it("uses one browser Back event for the top detail and preserves the popup", () => {
    const controller = createShellController({ initialRoute: "projects" });
    render(<CompanionShell controller={controller} projects={[{ id: "alpha", name: "Alpha" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "View Alpha" }));

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
