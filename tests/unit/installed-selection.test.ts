import { describe, expect, it } from "vitest";

import {
  clearInstalledSelection,
  EMPTY_INSTALLED_SELECTION,
  reconcileInstalledSelection,
  selectInstalledKit,
  startInstalledSelection,
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

  it("enters empty selection mode explicitly and Clear exits it", () => {
    expect(startInstalledSelection()).toEqual({
      active: true,
      projectIds: [],
      sourceKitIds: [],
    });
    expect(clearInstalledSelection()).toBe(EMPTY_INSTALLED_SELECTION);
  });
});
