import { describe, expect, it } from "vitest";

import {
  clearInstalledSelection,
  EMPTY_INSTALLED_SELECTION,
  reconcileInstalledSelection,
  selectInstalledKit,
  toggleInstalledProject,
} from "../../src/ui/installed/installed-selection";

describe("Installed selection", () => {
  it("unions overlapping Kit members and tracks explicit Kit sources", () => {
    const writers = selectInstalledKit(EMPTY_INSTALLED_SELECTION, "writers", ["alpha", "shared"]);
    const tools = selectInstalledKit(writers, "tools", ["shared", "beta"]);

    expect(tools).toEqual({
      active: true,
      projectIds: ["alpha", "shared", "beta"],
      sourceKitIds: ["writers", "tools"],
    });
  });

  it("drops a Kit source when an extension selection is refined", () => {
    const selected = selectInstalledKit(EMPTY_INSTALLED_SELECTION, "writers", ["alpha", "beta"]);
    const refined = toggleInstalledProject(selected, "beta");

    expect(
      reconcileInstalledSelection(refined, ["alpha", "beta"], {
        writers: ["alpha", "beta"],
      }),
    ).toEqual({ active: true, projectIds: ["alpha"], sourceKitIds: [] });
  });

  it("exits selection when the final selected extension is toggled off", () => {
    expect(
      toggleInstalledProject(
        { active: true, projectIds: ["alpha"], sourceKitIds: ["writers"] },
        "alpha",
      ),
    ).toBe(EMPTY_INSTALLED_SELECTION);
  });

  it("Clear exits selection", () => {
    expect(clearInstalledSelection()).toBe(EMPTY_INSTALLED_SELECTION);
  });
});
