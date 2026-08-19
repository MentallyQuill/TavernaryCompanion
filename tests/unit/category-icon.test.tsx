import { render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";

import { CategoryIcon } from "../../src/ui/shared/category-icon";

afterEach(() => document.body.replaceChildren());

describe("CategoryIcon", () => {
  it("renders Tavernary's navigation and action glyphs instead of the fallback grid", () => {
    for (const name of [
      "search",
      "chevron",
      "filter-lines",
      "collapse",
      "close",
      "kit",
      "add-to-kit",
    ]) {
      render(<CategoryIcon name={name} />);
    }

    expect(document.querySelector('svg[data-icon="search"] circle')).toHaveAttribute("r", "7");
    expect(document.querySelector('svg[data-icon="chevron"] path')).toHaveAttribute(
      "d",
      "m6 9 6 6 6-6",
    );
    expect(document.querySelector('svg[data-icon="filter-lines"] path')).toHaveAttribute(
      "d",
      "M4 6h16M7 12h10M10 18h4",
    );
    expect(document.querySelector('svg[data-icon="collapse"]')).toHaveAttribute(
      "viewBox",
      "0 0 32 32",
    );
    expect(document.querySelector('svg[data-icon="close"] path')).toHaveAttribute(
      "d",
      "m6 6 12 12M18 6 6 18",
    );
    expect(document.querySelector('svg[data-icon="kit"]')).toHaveAttribute("viewBox", "3 3 26 26");
    expect(document.querySelector('svg[data-icon="add-to-kit"] path')).toHaveAttribute(
      "d",
      "M4 6h10v12H4zM17 8v8M13 12h8",
    );
  });

  it.each([
    ["memory-retrieval", "0 0 24 24", 8],
    ["generation-reasoning", "0 0 487.6 487.6", 1],
    ["character-worldbuilding", "0 0 512 512", 1],
    ["rpg-systems", "-16 0 512 512", 1],
    ["interface-workflow", "0 0 24 24", 1],
    ["developer-infrastructure", "0 0 24 24", 2],
    ["preset", "0 0 24 24", 2],
    ["frontend", "0 0 24 24", 1],
  ] as const)("renders Tavernary's real %s SVG", (name, viewBox, pathCount) => {
    render(<CategoryIcon name={name} />);

    const icon = document.querySelector(`svg[data-icon="${name}"]`);
    expect(icon).toHaveAttribute("viewBox", viewBox);
    expect(icon?.querySelectorAll("path")).toHaveLength(pathCount);
    if (name === "interface-workflow") {
      expect(icon?.querySelectorAll("circle")).toHaveLength(3);
    }
    if (name === "rpg-systems") {
      expect(icon?.querySelector("path")).toHaveAttribute(
        "d",
        expect.stringContaining("4.03-1.97 2.25-8.06-2.2-7.56"),
      );
    }
  });
});
