import { render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";

import { InstallIcon } from "../../src/ui/shared/install-icon";

const INSTALL_PATH =
  "M9 2v2H5l-.001 10h14L19 4h-4V2h5a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5zm9.999 14h-14L5 20h14l-.001-4zM17 17v2h-2v-2h2zM13 2v5h3l-4 4-4-4h3V2h2z";

afterEach(() => document.body.replaceChildren());

describe("InstallIcon", () => {
  it("renders the supplied install glyph as a themeable 24px SVG", () => {
    render(<InstallIcon />);

    const icon = screen.getByTestId("install-icon");
    expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
    expect(icon).toHaveAttribute("fill", "currentColor");
    expect(icon.querySelector("path")).toHaveAttribute("d", INSTALL_PATH);
  });
});
