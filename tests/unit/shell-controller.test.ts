import { describe, expect, it, vi } from "vitest";

import { createShellController } from "../../src/ui/shell/shell-controller";

describe("ShellController", () => {
  it("persists route changes without persisting nested detail history", () => {
    const persistRoute = vi.fn();
    const controller = createShellController({
      initialRoute: "projects",
      persistRoute,
    });

    controller.openDetail({ kind: "project", id: "alpha", focusKey: "project-alpha" });
    expect(persistRoute).not.toHaveBeenCalled();

    controller.navigate("installed");
    expect(controller.read()).toMatchObject({ route: "installed", detailStack: [] });
    expect(persistRoute).toHaveBeenCalledWith("installed");
  });

  it("closes the top nested surface before yielding Back to the host popup", () => {
    const controller = createShellController({ initialRoute: "projects" });
    controller.openDetail({ kind: "project", id: "alpha", focusKey: "project-alpha" });
    controller.openFilter("sheet");

    expect(controller.back()).toEqual({ handled: true, focusKey: "filter-trigger" });
    expect(controller.back()).toEqual({ handled: true, focusKey: "project-alpha" });
    expect(controller.back()).toEqual({ handled: false, focusKey: null });
  });
});
