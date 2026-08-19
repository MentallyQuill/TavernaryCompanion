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
    definitionProjectIds: kit.projectIds,
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

it("hydrates unknown legacy topology only when its fingerprint matches the current definition", async () => {
  const extensionSettings: Record<string, unknown> = {};
  const profile = new ProfileStore({ extensionSettings, saveSettingsDebounced: () => undefined });
  const kits = new KitStore(profile, {
    uuid: () => "018f6f42-7142-7a1f-9b52-9d3a7d548120",
    now: () => "2026-08-18T00:00:00.000Z",
  });
  const kit = await kits.create({ title: "Writer", projectIds: ["context", "alpha"] });
  const definitionFingerprint = await fingerprintKitTopology(kit.projectIds);
  await profile.update((draft) => {
    draft.installedKits[kit.id] = {
      kitId: kit.id,
      definitionFingerprint,
      installedProjectIds: ["alpha"],
      missingProjectIds: [],
      status: "installed",
      installedAt: "2026-08-18T00:00:00.000Z",
      lastVerifiedAt: "2026-08-18T00:00:00.000Z",
    };
  });
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });

  await buildKitPresentation({ ...catalogFixture(), projects: [alpha] }, kits, {
    managed: [],
    external: [],
    unknown: [],
    missingManaged: [],
  });

  expect(kits.readInstalled(kit.id)?.definitionProjectIds).toEqual(["context", "alpha"]);
});

it("builds Installed Kit cards from installed topology instead of edited definitions", async () => {
  const profile = new ProfileStore({
    extensionSettings: {},
    saveSettingsDebounced: () => undefined,
  });
  const kits = new KitStore(profile, {
    uuid: () => "018f6f42-7142-7a1f-9b52-9d3a7d548120",
    now: () => "2026-08-18T00:00:00.000Z",
  });
  const kit = await kits.create({ title: "Writer", projectIds: ["old", "context"] });
  await kits.recordInstalledState({
    kitId: kit.id,
    definitionFingerprint: await fingerprintKitTopology(kit.projectIds),
    definitionProjectIds: ["old", "context"],
    installedProjectIds: ["old"],
    missingProjectIds: [],
    status: "installed",
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  });
  await kits.update(kit.id, { projectIds: ["new"] });
  const projects = ["old", "context", "new"].map((id) =>
    catalogProjectFixture({ id, folderName: id }),
  );

  const presentation = await buildKitPresentation({ ...catalogFixture(), projects }, kits, {
    managed: [],
    external: [],
    unknown: [],
    missingManaged: [],
  });

  expect(presentation.installedKits).toEqual([
    expect.objectContaining({
      id: kit.id,
      title: "Writer",
      orphaned: false,
      installedProjectIds: ["old"],
      components: [
        expect.objectContaining({ projectId: "old", name: "old" }),
        expect.objectContaining({ projectId: "context", name: "context" }),
      ],
    }),
  ]);
});

it("keeps orphaned installed Kits visible with their installed topology", async () => {
  const profile = new ProfileStore({
    extensionSettings: {},
    saveSettingsDebounced: () => undefined,
  });
  const kits = new KitStore(profile);
  await kits.recordInstalledState({
    kitId: "removed-published-kit",
    definitionFingerprint: await fingerprintKitTopology(["alpha"]),
    definitionProjectIds: ["alpha"],
    installedProjectIds: ["alpha"],
    missingProjectIds: [],
    status: "installed",
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  });
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });

  const presentation = await buildKitPresentation(
    { ...catalogFixture(), projects: [alpha], kits: [] },
    kits,
    { managed: [], external: [], unknown: [], missingManaged: [] },
  );

  expect(presentation.installedKits).toEqual([
    expect.objectContaining({
      id: "removed-published-kit",
      title: "removed-published-kit",
      orphaned: true,
      installedProjectIds: ["alpha"],
      components: [expect.objectContaining({ projectId: "alpha", name: "alpha" })],
    }),
  ]);
});
