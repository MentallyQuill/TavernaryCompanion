import { fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_COMPANION_QUERY } from "../../src/catalog/catalog-core";
import type { DiscoveryState } from "../../src/catalog/discovery-controller";
import type { ProjectFacets } from "../../src/ui/projects/filter-panel";
import { ProjectsRoute } from "../../src/ui/projects/projects-route";

afterEach(() => document.body.replaceChildren());

function state(): DiscoveryState {
  return {
    query: structuredClone(DEFAULT_COMPANION_QUERY),
    catalogState: "ready-current",
    projects: [],
    installedSections: [],
  };
}

function facets(overrides: Partial<ProjectFacets> = {}): ProjectFacets {
  return {
    frontends: [{ id: "sillytavern", label: "SillyTavern", count: 1 }],
    kinds: [
      { id: "frontend", label: "Frontend", count: 1 },
      { id: "extension", label: "Extension", count: 1 },
      { id: "preset", label: "System Preset", count: 1 },
    ],
    tags: [],
    modelFamilies: [],
    completionFormats: [],
    development: [
      { id: "active-month", label: "Active this month", count: 1 },
      { id: "new-release", label: "Recently released", count: 1 },
      { id: "dormant", label: "Dormant", count: 0 },
    ],
    licenses: [
      { id: "open-source", label: "Open source", count: 1 },
      { id: "proprietary", label: "Proprietary", count: 0 },
      { id: "pending", label: "Pending verification", count: 0 },
      { id: "missing", label: "Missing license", count: 0 },
    ],
    ...overrides,
  };
}

describe("ProjectsRoute", () => {
  it("shows the approved SillyTavern extension and preset defaults", () => {
    render(<ProjectsRoute state={state()} onQueryChange={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "SillyTavern" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Extension" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "System Preset" })).toBeChecked();
    expect(screen.queryByRole("heading", { name: "Projects" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing SillyTavern extensions/)).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "Search projects" })).not.toBeInTheDocument();
    expect(screen.getByText("0 projects")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Sort projects" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen
        .getByRole("button", { name: "Open filters" })
        .querySelector('svg[data-icon="filter-lines"]'),
    ).not.toBeNull();
    expect(screen.getByText("Refine catalog")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Filters" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close filters" }).textContent).toBe("");
    const activeFilters = screen.getByLabelText("Active filters");
    expect(
      within(activeFilters).getByRole("button", { name: "Remove SillyTavern filter" }),
    ).toBeVisible();
    expect(
      within(activeFilters).getByRole("button", { name: "Remove Extension filter" }),
    ).toBeVisible();
    expect(
      within(activeFilters).getByRole("button", { name: "Remove System Preset filter" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Safety: TavernKeeper scans are advisory, not a guarantee. Review a project carefully before installing it or providing credentials.",
      }),
    ).toHaveAttribute("href", "https://tavernary.org/about/#safety-security");
  });

  it("switches Tavernary card density through the collapse control", () => {
    const onQueryChange = vi.fn();
    render(<ProjectsRoute state={state()} onQueryChange={onQueryChange} />);

    const density = screen.getByRole("button", { name: "Use compact cards" });
    expect(density).toHaveAttribute("aria-pressed", "false");
    expect(density.querySelector('svg[data-icon="collapse"]')).not.toBeNull();

    fireEvent.click(density);

    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ density: "compact" }));
  });

  it("exposes every project facet and lets users clear SillyTavern", () => {
    const onQueryChange = vi.fn();
    render(
      <ProjectsRoute
        state={state()}
        onQueryChange={onQueryChange}
        facets={facets({
          frontends: [
            { id: "sillytavern", label: "SillyTavern", count: 1 },
            { id: "risuai", label: "RisuAI", count: 1 },
          ],
          tags: [
            {
              id: "memory",
              label: "Memory",
              description: "Memory",
              facet: "goal",
              count: 1,
            },
          ],
          modelFamilies: [{ id: "claude", label: "Claude", count: 1 }],
          completionFormats: [{ id: "chat-completion", label: "Chat completion", count: 1 }],
        })}
      />,
    );

    for (const name of [
      "Compatible frontend",
      "Project kind",
      "Model family",
      "Completion format",
      "Development",
      "License",
    ]) {
      expect(screen.getByRole("group", { name })).toBeVisible();
    }
    expect(screen.getByRole("region", { name: "Goals & traits" })).toBeVisible();

    fireEvent.click(screen.getByRole("checkbox", { name: "SillyTavern" }));
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ frontends: [] }));
  });

  it("removes one selected chip", () => {
    const onQueryChange = vi.fn();
    const current = state();
    current.query.frontends = ["sillytavern", "risuai"];
    render(
      <ProjectsRoute
        state={current}
        onQueryChange={onQueryChange}
        facets={facets({
          frontends: [
            { id: "sillytavern", label: "SillyTavern", count: 1 },
            { id: "risuai", label: "RisuAI", count: 1 },
          ],
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove RisuAI filter" }));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ frontends: ["sillytavern"] }),
    );
  });

  it("removes exactly one value from every active filter dimension", () => {
    const onQueryChange = vi.fn();
    const current = state();
    current.query.category = "preset";
    current.query.frontends = ["sillytavern"];
    current.query.kinds = ["preset"];
    current.query.tags = ["memory"];
    current.query.modelFamilies = ["claude"];
    current.query.completionFormats = ["chat-completion"];
    current.query.development = ["active-month"];
    current.query.licenses = ["open-source"];
    current.query.view = "active";
    render(
      <ProjectsRoute
        state={current}
        onQueryChange={onQueryChange}
        facets={facets({
          tags: [
            {
              id: "memory",
              label: "Memory",
              description: "Memory",
              facet: "goal",
              count: 1,
            },
          ],
          modelFamilies: [{ id: "claude", label: "Claude", count: 1 }],
          completionFormats: [{ id: "chat-completion", label: "Chat completion", count: 1 }],
        })}
      />,
    );

    expect(
      within(screen.getByRole("button", { name: "Open filters" })).getByText("7"),
    ).toBeVisible();

    for (const [name, property, emptyValue] of [
      ["Remove System Presets category filter", "category", ""],
      ["Remove SillyTavern filter", "frontends", []],
      ["Remove System Preset filter", "kinds", []],
      ["Remove Memory filter", "tags", []],
      ["Remove Claude filter", "modelFamilies", []],
      ["Remove Chat completion filter", "completionFormats", []],
      ["Remove Active this month filter", "development", []],
      ["Remove Open source filter", "licenses", []],
      ["Remove Active catalog view filter", "view", "all"],
    ] as const) {
      onQueryChange.mockClear();
      fireEvent.click(screen.getByRole("button", { name }));
      const emitted = onQueryChange.mock.calls[0]?.[0];
      expect(emitted?.[property]).toEqual(emptyValue);
      expect(emitted?.search).toBe(current.query.search);
      expect(emitted?.sort).toBe(current.query.sort);
    }
  });

  it("uses shared catalog sort labels", () => {
    render(<ProjectsRoute state={state()} onQueryChange={vi.fn()} />);
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(
      expect.arrayContaining([
        "Recent Activity",
        "Date Added",
        "Sustained Activity",
        "Popularity",
        "Alphabetical",
        "Relevance",
      ]),
    );
  });

  it("closes the compact filter surface with Escape and restores focus", async () => {
    render(<ProjectsRoute state={state()} onQueryChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Open filters" });
    expect(screen.queryByRole("dialog", { name: "Project filters" })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Project filters" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    fireEvent.keyDown(window, { key: "Escape" });
    await vi.waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the compact filter surface from its backdrop and restores focus", async () => {
    render(<ProjectsRoute state={state()} onQueryChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Open filters" });
    fireEvent.click(trigger);

    fireEvent.pointerDown(screen.getByTestId("filter-backdrop"));

    await vi.waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "Project filters" })).not.toBeInTheDocument();
  });

  it("clears filters from the persistent filter header", () => {
    const onQueryChange = vi.fn();
    const current = state();
    current.query.search = "memory";
    current.query.sort = "popularity";
    current.query.tags = ["memory"];
    render(<ProjectsRoute state={current} onQueryChange={onQueryChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: "memory",
        sort: "popularity",
        tags: [],
      }),
    );
  });
});
