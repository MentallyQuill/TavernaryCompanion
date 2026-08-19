import { fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_COMPANION_QUERY } from "../../src/catalog/catalog-core";
import { FilterPanel, type ProjectFacets } from "../../src/ui/projects/filter-panel";

afterEach(() => document.body.replaceChildren());

const facets: ProjectFacets = {
  frontends: [
    { id: "sillytavern", label: "SillyTavern", count: 12 },
    { id: "risuai", label: "RisuAI", count: 4 },
    { id: "agnai", label: "Agnai", count: 2 },
    { id: "koboldcpp", label: "KoboldCpp", count: 1 },
  ],
  kinds: [
    { id: "frontend", label: "Frontend", count: 3 },
    { id: "extension", label: "Extension", count: 8 },
    { id: "preset", label: "System Preset", count: 5 },
  ],
  tags: [
    {
      id: "memory",
      label: "Memory",
      description: "Adds memory behavior",
      facet: "goal",
      count: 6,
    },
    {
      id: "local-first",
      label: "Local first",
      description: "Works with local services",
      facet: "trait",
      count: 2,
    },
  ],
  modelFamilies: [{ id: "claude", label: "Claude", count: 4 }],
  completionFormats: [{ id: "chat-completion", label: "Chat completion", count: 3 }],
  development: [
    { id: "active-month", label: "Active this month", count: 9 },
    { id: "new-release", label: "Recently released", count: 4 },
    { id: "dormant", label: "Dormant", count: 1 },
  ],
  licenses: [
    { id: "open-source", label: "Open source", count: 10 },
    { id: "proprietary", label: "Proprietary", count: 1 },
    { id: "pending", label: "Pending verification", count: 2 },
    { id: "missing", label: "Missing license", count: 1 },
  ],
};

describe("FilterPanel", () => {
  it("matches Tavernary's filter groups, presentations, and data-derived counts", () => {
    render(
      <FilterPanel
        query={structuredClone(DEFAULT_COMPANION_QUERY)}
        facets={facets}
        onQueryChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("combobox", { name: "Category" })).not.toBeInTheDocument();
    expect([...document.querySelectorAll("legend")].map((legend) => legend.textContent)).toEqual([
      "Compatible frontend",
      "Project kind",
      "Goals & traits",
      "Goals",
      "Traits",
      "Model family",
      "Completion format",
      "Development",
      "License",
    ]);

    const frontends = screen.getByRole("group", { name: "Compatible frontend" });
    expect(within(frontends).getByRole("checkbox", { name: "SillyTavern" })).toBeChecked();
    expect(within(frontends).getByLabelText("12 projects")).toBeVisible();
    expect(
      within(frontends).queryByRole("checkbox", { name: "KoboldCpp" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Memory" })).toHaveClass(
      "tavernary-companion-filter-choice__input",
    );
    expect(screen.getByRole("checkbox", { name: "Claude" })).toHaveClass(
      "tavernary-companion-filter-choice__input",
    );
  });

  it("searches and expands frontends and emits isolated toggles", () => {
    const onQueryChange = vi.fn();
    render(
      <FilterPanel
        query={structuredClone(DEFAULT_COMPANION_QUERY)}
        facets={facets}
        onQueryChange={onQueryChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show 1 more" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "KoboldCpp" }));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ frontends: ["sillytavern", "koboldcpp"] }),
    );

    fireEvent.input(screen.getByRole("searchbox", { name: "Search compatible frontends" }), {
      target: { value: "risu" },
    });
    expect(screen.getByRole("checkbox", { name: "RisuAI" })).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: "Agnai" })).not.toBeInTheDocument();
  });
});
