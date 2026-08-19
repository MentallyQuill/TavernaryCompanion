import { render, screen, within } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_COMPANION_QUERY } from "../../src/catalog/catalog-core";
import { CatalogNavigation } from "../../src/ui/shell/catalog-navigation";

afterEach(() => document.body.replaceChildren());

describe("CatalogNavigation", () => {
  it("keeps non-installable frontends out of category navigation", async () => {
    const user = userEvent.setup();
    render(
      <CatalogNavigation
        route="projects"
        query={structuredClone(DEFAULT_COMPANION_QUERY)}
        onNavigate={vi.fn()}
        onQueryChange={vi.fn()}
      />,
    );

    expect(
      within(screen.getByRole("navigation", { name: "Catalog categories" })).queryByRole("button", {
        name: "Frontends",
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Browse categories" }));
    expect(
      within(screen.getByRole("group", { name: "Browse categories menu" })).queryByRole("button", {
        name: "Frontends",
      }),
    ).not.toBeInTheDocument();
  });

  it("selects a Tavernary project category with its canonical SVG", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onQueryChange = vi.fn();
    const view = render(
      <CatalogNavigation
        route="projects"
        query={structuredClone(DEFAULT_COMPANION_QUERY)}
        onNavigate={onNavigate}
        onQueryChange={onQueryChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "System Presets" }));

    expect(onNavigate).toHaveBeenCalledWith("projects");
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ category: "preset" }));
    expect(view.container.querySelector('[data-category="preset"] [data-icon="preset"]')).toBe(
      screen.getByRole("button", { name: "System Presets" }).querySelector("svg"),
    );
  });

  it("uses a button-driven Browse menu for Companion routes", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <CatalogNavigation
        route="projects"
        query={structuredClone(DEFAULT_COMPANION_QUERY)}
        onNavigate={onNavigate}
        onQueryChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Browse categories" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.click(
      within(screen.getByRole("group", { name: "Browse categories menu" })).getByRole("button", {
        name: "Installed",
      }),
    );

    expect(onNavigate).toHaveBeenCalledWith("installed");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
