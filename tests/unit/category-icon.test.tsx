import { render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";

import { CategoryIcon } from "../../src/ui/shared/category-icon";

afterEach(() => document.body.replaceChildren());

describe("CategoryIcon", () => {
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
