import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Tooltip } from "../../src/ui/shared/tooltip";

afterEach(() => document.body.replaceChildren());

describe("Tooltip", () => {
  it("ports Tavernary's desktop portal, focus, and dismissal behavior", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    render(
      <Tooltip id="alpha-tip" label="Exact Tavernary copy">
        <button type="button">Alpha</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "Alpha" });
    fireEvent.focus(button);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Exact Tavernary copy");
    expect(tooltip.parentElement).toBe(document.body);
    expect(button.closest("span")).toHaveAttribute("aria-describedby", "alpha-tip");

    const hostEscape = vi.fn();
    window.addEventListener("keydown", hostEscape);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(hostEscape).not.toHaveBeenCalled();
    window.removeEventListener("keydown", hostEscape);
  });

  it("suppresses hover tooltips at Tavernary's mobile breakpoint", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    render(
      <Tooltip id="mobile-tip" label="Hidden on mobile">
        <span>Mobile</span>
      </Tooltip>,
    );
    fireEvent.pointerEnter(screen.getByText("Mobile"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
