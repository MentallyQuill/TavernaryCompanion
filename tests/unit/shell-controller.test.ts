import { describe, expect, it, vi } from "vitest";

import { createShellController } from "../../src/ui/shell/shell-controller";

describe("ShellController", () => {
  it("persists route changes without persisting nested detail history", () => {
    const persistRoute = vi.fn();
    const controller = createShellController({
      initialRoute: "projects",
      persistRoute,
    });

    controller.openDetail({ kind: "kit", id: "alpha", focusKey: "kit-alpha" });
    expect(persistRoute).not.toHaveBeenCalled();

    controller.navigate("installed");
    expect(controller.read()).toMatchObject({ route: "installed", detailStack: [] });
    expect(persistRoute).toHaveBeenCalledWith("installed");
  });

  it("closes the top nested surface before yielding Back to the host popup", () => {
    const controller = createShellController({ initialRoute: "projects" });
    controller.openDetail({ kind: "kit", id: "alpha", focusKey: "kit-alpha" });
    controller.openFilter("sheet");

    expect(controller.back()).toEqual({ handled: true, focusKey: "filter-trigger" });
    expect(controller.back()).toEqual({ handled: true, focusKey: "kit-alpha" });
    expect(controller.back()).toEqual({ handled: false, focusKey: null });
  });
});
