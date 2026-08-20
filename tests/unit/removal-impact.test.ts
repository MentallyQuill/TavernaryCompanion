import { expect, it } from "vitest";

import {
  markInstalledKitsIncomplete,
  previewRemovalImpact,
  projectKitReferences,
} from "../../src/lifecycle/removal-impact";

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

it("exposes stable installed Kit references for aggregate removal planning", () => {
  expect(
    projectKitReferences(
      "alpha",
      {
        zeta: { installedProjectIds: ["alpha"] },
        alpha: { installedProjectIds: ["alpha", "beta"] },
      },
      { zeta: "Zeta", alpha: "Alpha" },
    ),
  ).toEqual([
    { id: "alpha", title: "Alpha" },
    { id: "zeta", title: "Zeta" },
  ]);
});

it("moves a directly removed project from installed to missing Kit membership", () => {
  const next = markInstalledKitsIncomplete(
    {
      daily: {
        installedProjectIds: ["alpha", "beta"],
        missingProjectIds: [],
        status: "installed",
      },
    },
    "alpha",
  );

  expect(next.daily).toMatchObject({
    installedProjectIds: ["beta"],
    missingProjectIds: ["alpha"],
    status: "incomplete",
  });
});
