import { expect, it, vi } from "vitest";

import { forgetMissingManagedRecord } from "../../src/inventory/missing-managed-record";
import type {
  InventorySnapshot,
  ManagedExtensionRecord,
} from "../../src/inventory/inventory-types";
import { ProfileStore } from "../../src/state/profile-store";

const storyRecord: ManagedExtensionRecord = {
  projectId: "story-engine",
  internalName: "third-party/Story-Engine",
  folderName: "Story-Engine",
  installedAt: "2026-08-19T16:03:54.690Z",
  installedBy: "individual",
};

function inventory(missing: boolean): InventorySnapshot {
  return {
    managed: [],
    external: [],
    unknown: [],
    missingManaged: missing ? [{ record: storyRecord, project: null }] : [],
  };
}

it("forgets only a managed record confirmed missing by current inventory", async () => {
  const saveSettings = vi.fn();
  const store = new ProfileStore({ extensionSettings: {}, saveSettings });
  await store.update((draft) => {
    draft.managedExtensions[storyRecord.projectId] = storyRecord;
    draft.managedExtensions.other = { ...storyRecord, projectId: "other", folderName: "Other" };
  });
  saveSettings.mockClear();

  await expect(
    forgetMissingManagedRecord({
      projectId: storyRecord.projectId,
      inventory: inventory(true),
      store,
    }),
  ).resolves.toBe(true);

  expect(store.read().managedExtensions).not.toHaveProperty(storyRecord.projectId);
  expect(store.read().managedExtensions).toHaveProperty("other");
  expect(saveSettings).toHaveBeenCalledOnce();
});

it("refuses to forget a record that current inventory does not mark missing", async () => {
  const saveSettings = vi.fn();
  const store = new ProfileStore({ extensionSettings: {}, saveSettings });
  await store.update((draft) => {
    draft.managedExtensions[storyRecord.projectId] = storyRecord;
  });
  saveSettings.mockClear();

  await expect(
    forgetMissingManagedRecord({
      projectId: storyRecord.projectId,
      inventory: inventory(false),
      store,
    }),
  ).resolves.toBe(false);

  expect(store.read().managedExtensions).toHaveProperty(storyRecord.projectId);
  expect(saveSettings).not.toHaveBeenCalled();
});
