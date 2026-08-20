import { expect, it, vi } from "vitest";

import type { HostExtension } from "../../src/host/host-types";
import { pruneAbsentManagedRecords } from "../../src/inventory/inventory-reconciler";
import type { ManagedExtensionRecord } from "../../src/inventory/inventory-types";
import { normalizeManagedExtensionMap } from "../../src/inventory/managed-registry";
import { ProfileStore } from "../../src/state/profile-store";

const storyRecord: ManagedExtensionRecord = {
  projectId: "story-engine",
  internalName: "third-party/Story-Engine",
  folderName: "Story-Engine",
  installedAt: "2026-08-19T16:03:54.690Z",
  installedBy: "individual",
};

const installedStory: HostExtension = {
  internalName: storyRecord.internalName,
  folderName: storyRecord.folderName,
  enabled: true,
  type: "local",
  manifest: { display_name: "Story Engine" },
};

async function createStore(record: ManagedExtensionRecord = storyRecord) {
  const saveSettings = vi.fn();
  const store = new ProfileStore({ extensionSettings: {}, saveSettings });
  await store.update((draft) => {
    draft.managedExtensions[record.projectId] = record;
  });
  saveSettings.mockClear();
  return { saveSettings, store };
}

it("automatically removes a managed record whose exact extension identity is absent", async () => {
  const { saveSettings, store } = await createStore();
  const observedManaged = normalizeManagedExtensionMap(store.read().managedExtensions);

  await expect(
    pruneAbsentManagedRecords({ observedManaged, hostExtensions: [], store }),
  ).resolves.toEqual(["story-engine"]);

  expect(store.read().managedExtensions).not.toHaveProperty("story-engine");
  expect(saveSettings).toHaveBeenCalledOnce();
});

it("retains a record whenever its exact extension identity is still installed", async () => {
  const { saveSettings, store } = await createStore();
  const observedManaged = normalizeManagedExtensionMap(store.read().managedExtensions);

  await expect(
    pruneAbsentManagedRecords({ observedManaged, hostExtensions: [installedStory], store }),
  ).resolves.toEqual([]);

  expect(store.read().managedExtensions).toHaveProperty("story-engine");
  expect(saveSettings).not.toHaveBeenCalled();
});

it("does not remove a record that changed after inventory discovery began", async () => {
  const { saveSettings, store } = await createStore();
  const observedManaged = normalizeManagedExtensionMap(store.read().managedExtensions);
  const replacement = { ...storyRecord, installedAt: "2026-08-20T17:00:00.000Z" };
  await store.update((draft) => {
    draft.managedExtensions[replacement.projectId] = replacement;
  });
  saveSettings.mockClear();

  await expect(
    pruneAbsentManagedRecords({ observedManaged, hostExtensions: [], store }),
  ).resolves.toEqual([]);

  expect(store.read().managedExtensions[replacement.projectId]).toMatchObject(replacement);
  expect(saveSettings).not.toHaveBeenCalled();
});
