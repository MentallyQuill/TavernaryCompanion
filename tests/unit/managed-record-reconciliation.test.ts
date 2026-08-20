import { expect, it, vi } from "vitest";

import type { HostExtension } from "../../src/host/host-types";
import { discoverAndPruneManagedRecords } from "../../src/inventory/inventory-reconciler";
import type { ManagedExtensionRecord } from "../../src/inventory/inventory-types";
import { ProfileStore } from "../../src/state/profile-store";
import { createFakeHost } from "../helpers/fake-host";

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

it("automatically removes an absent exact identity without changing Kits or receipts", async () => {
  const { saveSettings, store } = await createStore();
  const installedKits = { starter: { status: "installed", projectIds: ["story-engine"] } };
  const operationReceipt = { id: "receipt-1", kind: "remove", status: "succeeded" };
  await store.update((draft) => {
    draft.installedKits = installedKits;
    draft.operationReceipt = operationReceipt;
  });
  saveSettings.mockClear();
  const host = createFakeHost();

  await expect(discoverAndPruneManagedRecords({ host, store })).resolves.toEqual([]);

  expect(store.read().managedExtensions).not.toHaveProperty("story-engine");
  expect(store.read().installedKits).toEqual(installedKits);
  expect(store.read().operationReceipt).toEqual(operationReceipt);
  expect(saveSettings).toHaveBeenCalledOnce();
  expect(host.calls.filter(({ operation }) => operation === "discover")).toHaveLength(2);
});

it("retains a record when its exact extension identity is installed", async () => {
  const { saveSettings, store } = await createStore();
  const host = createFakeHost({ extensions: [installedStory] });

  await expect(discoverAndPruneManagedRecords({ host, store })).resolves.toEqual([installedStory]);

  expect(store.read().managedExtensions).toHaveProperty("story-engine");
  expect(saveSettings).not.toHaveBeenCalled();
  expect(host.calls.filter(({ operation }) => operation === "discover")).toHaveLength(1);
});

it("does not prune when discovery fails", async () => {
  const { saveSettings, store } = await createStore();
  const host = createFakeHost({ failures: { discover: new Error("offline") } });

  await expect(discoverAndPruneManagedRecords({ host, store })).rejects.toThrow("offline");

  expect(store.read().managedExtensions).toHaveProperty("story-engine");
  expect(saveSettings).not.toHaveBeenCalled();
});

it("retains an extension reinstalled between absence detection and confirmation", async () => {
  const { saveSettings, store } = await createStore();
  const host = createFakeHost();
  const discover = vi
    .spyOn(host, "discover")
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([installedStory]);

  await expect(discoverAndPruneManagedRecords({ host, store })).resolves.toEqual([installedStory]);

  expect(store.read().managedExtensions).toHaveProperty("story-engine");
  expect(saveSettings).not.toHaveBeenCalled();
  expect(discover).toHaveBeenCalledTimes(2);
});

it("retains a record rewritten while discovery is in flight", async () => {
  const { saveSettings, store } = await createStore();
  let resolveFirstDiscovery!: (extensions: HostExtension[]) => void;
  const firstDiscovery = new Promise<HostExtension[]>((resolve) => {
    resolveFirstDiscovery = resolve;
  });
  const host = createFakeHost();
  const discover = vi
    .spyOn(host, "discover")
    .mockImplementationOnce(() => firstDiscovery)
    .mockResolvedValueOnce([]);
  const operation = discoverAndPruneManagedRecords({ host, store });
  await vi.waitFor(() => expect(discover).toHaveBeenCalledOnce());
  const replacement = { ...storyRecord, installedAt: "2026-08-20T17:00:00.000Z" };
  await store.update((draft) => {
    draft.managedExtensions[replacement.projectId] = replacement;
  });
  saveSettings.mockClear();
  resolveFirstDiscovery([]);

  await expect(operation).resolves.toEqual([]);

  expect(store.read().managedExtensions[replacement.projectId]).toMatchObject(replacement);
  expect(saveSettings).not.toHaveBeenCalled();
});
