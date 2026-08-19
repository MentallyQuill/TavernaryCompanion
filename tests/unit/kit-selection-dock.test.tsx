import { fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";

import { KitSelectionDock } from "../../src/ui/kits/kit-selection-dock";

afterEach(() => document.body.replaceChildren());

it("uses Tavernary's compact Cancel and Add to Kit action contract", () => {
  const add = vi.fn();
  const cancel = vi.fn();
  render(<KitSelectionDock count={3} onAdd={add} onCancel={cancel} />);

  const dock = screen.getByRole("region", { name: "3 projects selected" });
  expect(screen.queryByRole("button", { name: "Review Kit" })).not.toBeInTheDocument();
  expect(within(dock).getByText("3")).toHaveClass("selection-count");

  fireEvent.click(within(dock).getByRole("button", { name: "Add 3 projects to Kit" }));
  fireEvent.click(within(dock).getByRole("button", { name: "Cancel" }));
  expect(add).toHaveBeenCalledOnce();
  expect(cancel).toHaveBeenCalledOnce();
});
