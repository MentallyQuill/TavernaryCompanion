import { expect, it } from "vitest";

import { previewRemovalImpact } from "../../src/lifecycle/removal-impact";

it("describes ownership and installed or active Kit drift", () => {
  const impact = previewRemovalImpact({
    projectId: "alpha",
    projectName: "Alpha",
    ownership: "managed",
    installedKits: {
      daily: { installedProjectIds: ["alpha", "beta"], status: "installed" },
      spare: { installedProjectIds: ["gamma"], status: "installed" },
    },
    kitTitles: { daily: "Daily", spare: "Spare" },
    activeKitId: "daily",
    removable: true,
  });

  expect(impact).toEqual({
    projectId: "alpha",
    projectName: "Alpha",
    ownership: "managed",
    ownershipLabel: "Managed by Companion",
    installedKits: [{ id: "daily", title: "Daily" }],
    activeKitAffected: true,
    removable: true,
    confirmation:
      "Uninstall Alpha? Daily will become incomplete, and the active Kit will show drift.",
  });
});
