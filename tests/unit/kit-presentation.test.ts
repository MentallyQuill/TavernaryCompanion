import { expect, it } from "vitest";

import { KitStore } from "../../src/kits/kit-store";
import { fingerprintKitTopology } from "../../src/kits/kit-validation";
import { ProfileStore } from "../../src/state/profile-store";
import { buildKitPresentation } from "../../src/ui/popup-host";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { extension } from "../helpers/kit-executor-fixture";

it("derives personal Kit status from current inventory instead of stored labels", async () => {
  const profile = new ProfileStore({
    extensionSettings: {},
    saveSettingsDebounced: () => undefined,
  });
  const kits = new KitStore(profile, {
    uuid: () => "018f6f42-7142-7a1f-9b52-9d3a7d548120",
    now: () => "2026-08-18T00:00:00.000Z",
  });
  const kit = await kits.create({ title: "Writer", projectIds: ["alpha"] });
  await kits.recordInstalledState({
    kitId: kit.id,
    definitionFingerprint: await fingerprintKitTopology(kit.projectIds),
    installedProjectIds: ["alpha"],
    missingProjectIds: [],
    status: "installed",
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  });
  await kits.setActive(kit.id);
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });

  const presentation = await buildKitPresentation(
    { ...catalogFixture(), projects: [alpha] },
    kits,
    {
      managed: [
        {
          project: alpha,
          extension: extension("Alpha", false),
          record: {
            projectId: "alpha",
            internalName: "third-party/Alpha",
            folderName: "Alpha",
            installedAt: "2026-08-18T00:00:00.000Z",
            installedBy: "kit",
          },
        },
      ],
      external: [],
      unknown: [],
      missingManaged: [],
    },
  );

  expect(presentation.statuses.get(kit.id)).toBe("drifted");
  expect(presentation.inspectors[kit.id]?.operationalStatus).toBe("Drifted");
});
