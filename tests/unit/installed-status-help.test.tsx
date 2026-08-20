import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  INSTALLED_KIT_STATUS_HELP,
  InstalledStatusHelp,
} from "../../src/ui/installed/installed-status-help";

afterEach(() => document.body.replaceChildren());
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

it("exposes exact Kit status meaning on hover and tap", () => {
  render(<InstalledStatusHelp status="Drifted" />);

  const control = screen.getByRole("button", { name: "Drifted Kit status help" });
  fireEvent.pointerEnter(control.closest(".tavernary-companion-tooltip-anchor")!);
  expect(screen.getByRole("tooltip")).toHaveTextContent(INSTALLED_KIT_STATUS_HELP.Drifted);
  fireEvent.click(control);
  expect(screen.getByRole("note")).toHaveTextContent(INSTALLED_KIT_STATUS_HELP.Drifted);
});

it("offers all status definitions from the Installed Kits heading", () => {
  render(<InstalledStatusHelp />);
  fireEvent.click(screen.getByRole("button", { name: "Kit status help" }));

  expect(screen.getByText(INSTALLED_KIT_STATUS_HELP.Active)).toBeVisible();
  expect(screen.getByText(INSTALLED_KIT_STATUS_HELP.Partial)).toBeVisible();
  expect(screen.getByText(INSTALLED_KIT_STATUS_HELP.Drifted)).toBeVisible();
  expect(screen.getByText(INSTALLED_KIT_STATUS_HELP.Missing)).toBeVisible();
});
