import { fireEvent, render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_COMPANION_QUERY } from "../../src/catalog/catalog-core";
import type { DiscoveryState } from "../../src/catalog/discovery-controller";
import { ProjectsRoute } from "../../src/ui/projects/projects-route";

afterEach(() => document.body.replaceChildren());

function state(): DiscoveryState {
  return {
    query: structuredClone(DEFAULT_COMPANION_QUERY),
    catalogState: "ready-current",
    projects: [],
    projectDetails: {},
    installedSections: [],
  };
}

describe("ProjectsRoute", () => {
  it("shows the approved SillyTavern extension and preset defaults", () => {
    render(<ProjectsRoute state={state()} onQueryChange={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "SillyTavern" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Extension" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Preset" })).toBeChecked();
    expect(
      screen.getByText(
        "Showing SillyTavern extensions and presets. Clear filters to explore all Tavernary projects.",
      ),
    ).toBeVisible();
  });

  it("exposes every project facet and lets users clear SillyTavern", () => {
    const onQueryChange = vi.fn();
    render(
      <ProjectsRoute
        state={state()}
        onQueryChange={onQueryChange}
        facets={{
          frontends: [
            { id: "sillytavern", label: "SillyTavern" },
            { id: "risuai", label: "RisuAI" },
          ],
          tags: [{ id: "memory", label: "Memory" }],
        }}
      />,
    );

    for (const name of [
      "Category",
      "Frontends",
      "Project type",
      "Tags",
      "Models",
      "Completion",
      "Development",
      "License",
      "Catalog view",
    ]) {
      expect(screen.getByRole("group", { name })).toBeVisible();
    }

    fireEvent.click(screen.getByRole("checkbox", { name: "SillyTavern" }));
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ frontends: [] }));
  });

  it("preserves literal search and removes one selected chip", async () => {
    const onQueryChange = vi.fn();
    const current = state();
    current.query.frontends = ["sillytavern", "risuai"];
    render(
      <ProjectsRoute
        state={current}
        onQueryChange={onQueryChange}
        facets={{
          frontends: [
            { id: "sillytavern", label: "SillyTavern" },
            { id: "risuai", label: "RisuAI" },
          ],
          tags: [],
        }}
      />,
    );

    await userEvent.type(screen.getByRole("searchbox", { name: "Search projects" }), "A + B");
    expect(onQueryChange).toHaveBeenLastCalledWith(expect.objectContaining({ search: "A + B" }));

    fireEvent.click(screen.getByRole("button", { name: "Remove RisuAI filter" }));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ frontends: ["sillytavern"] }),
    );
  });

  it("uses shared catalog sort labels", () => {
    render(<ProjectsRoute state={state()} onQueryChange={vi.fn()} />);
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(
      expect.arrayContaining([
        "Recently active",
        "Date added",
        "Sustained activity",
        "Popularity",
        "Alphabetical",
        "Relevance",
      ]),
    );
  });
});
