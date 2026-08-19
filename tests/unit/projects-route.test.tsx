import { fireEvent, render, screen } from "@testing-library/preact";
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
    expect(screen.queryByRole("heading", { name: "Projects" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing SillyTavern extensions/)).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "Search projects" })).not.toBeInTheDocument();
    expect(screen.getByText("0 projects")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Sort projects" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByLabelText("Active filters")).not.toBeInTheDocument();
    expect(screen.getByText(/TavernKeeper provides evidence/)).toBeVisible();
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

  it("removes one selected chip", () => {
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

  it("closes the compact filter surface with Escape and restores focus", async () => {
    render(<ProjectsRoute state={state()} onQueryChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Filters" });
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
});
