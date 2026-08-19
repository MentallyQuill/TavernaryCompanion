import { fireEvent, render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
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

  it("ports into the owning native dialog so the tooltip stays in the top layer", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    const dialog = document.createElement("dialog");
    dialog.setAttribute("open", "");
    const container = document.createElement("div");
    dialog.append(container);
    document.body.append(dialog);
    render(
      <Tooltip id="dialog-tip" label="Visible above the native popup">
        <button type="button">Dialog action</button>
      </Tooltip>,
      { container },
    );

    fireEvent.focus(screen.getByRole("button", { name: "Dialog action" }));

    expect(screen.getByRole("tooltip").parentElement).toBe(dialog);
  });

  it("does not let pointer-origin focus pin the tooltip open", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    render(
      <Tooltip id="pointer-tip" label="Pointer hover only">
        <button type="button">Pointer target</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "Pointer target" });
    const anchor = button.closest(".tavernary-companion-tooltip-anchor")!;
    fireEvent.pointerEnter(anchor, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Pointer hover only");

    fireEvent.pointerDown(button, { pointerType: "mouse" });
    button.focus();
    fireEvent.pointerUp(button, { pointerType: "mouse" });

    expect(button).toHaveFocus();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("suppresses compatibility focus after a wide-screen touch interaction", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    render(
      <Tooltip id="touch-tip" label="Touch must not pin this">
        <button type="button">Touch target</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "Touch target" });
    const anchor = button.closest(".tavernary-companion-tooltip-anchor")!;
    fireEvent.pointerDown(button, { pointerType: "touch" });
    fireEvent.pointerUp(button, { pointerType: "touch" });
    fireEvent.pointerLeave(anchor, { pointerType: "touch" });
    button.focus();
    fireEvent.focus(button);

    expect(button).toHaveFocus();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("restores focus tooltips when keyboard navigation follows a pointer click", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    render(
      <Tooltip id="mixed-input-tip" label="Keyboard focus remains available">
        <button type="button">Pointer first</button>
        <button type="button">Keyboard next</button>
      </Tooltip>,
    );

    const user = userEvent.setup();
    const pointerButton = screen.getByRole("button", { name: "Pointer first" });
    const keyboardButton = screen.getByRole("button", { name: "Keyboard next" });
    await user.click(pointerButton);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab();
    expect(keyboardButton).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Keyboard focus remains available");
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
