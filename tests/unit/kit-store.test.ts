import { describe, expect, it } from "vitest";

import { KitStore } from "../../src/kits/kit-store";
import { ProfileStore } from "../../src/state/profile-store";

function createStore() {
  const extensionSettings: Record<string, unknown> = {};
  return new KitStore(new ProfileStore({ extensionSettings, saveSettings: () => undefined }), {
    uuid: () => "018f6f42-7142-7a1f-9b52-9d3a7d548120",
    now: () => "2026-08-18T12:00:00.000Z",
  });
}

describe("KitStore", () => {
  it("creates, updates, duplicates, and removes portable definitions", async () => {
    const store = createStore();
    const created = await store.create({ title: "Writer", description: "", projectIds: ["alpha"] });
    expect(store.readDefinitions()).toEqual([created]);
    await store.update(created.id, { title: "Writer 2", projectIds: ["alpha", "beta"] });
    expect(store.readDefinition(created.id)?.title).toBe("Writer 2");
    await expect(store.removeDefinition(created.id)).resolves.toBe(true);
    expect(store.readDefinitions()).toEqual([]);
  });

  it("removes an installed active Kit without changing its extensions", async () => {
    const extensionSettings: Record<string, unknown> = {};
    const profile = new ProfileStore({ extensionSettings, saveSettings: () => undefined });
    const store = new KitStore(profile, {
      uuid: () => "018f6f42-7142-7a1f-9b52-9d3a7d548120",
      now: () => "2026-08-18T12:00:00.000Z",
    });
    const kit = await store.create({ title: "Writer", description: "", projectIds: ["alpha"] });
    await profile.update((draft) => {
      draft.managedExtensions.alpha = {
        projectId: "alpha",
        internalName: "author/alpha",
        folderName: "Alpha",
        installedAt: "2026-08-18T12:00:00.000Z",
        installedBy: "kit",
      };
    });
    await store.recordInstalledState({
      kitId: kit.id,
      definitionFingerprint: "a".repeat(64),
      definitionProjectIds: ["alpha"],
      installedProjectIds: ["alpha"],
      missingProjectIds: [],
      status: "installed",
      installedAt: "2026-08-18T12:00:00.000Z",
      lastVerifiedAt: "2026-08-18T12:00:00.000Z",
    });
    await store.setActive(kit.id);
    const managedExtensions = profile.read().managedExtensions;
    expect(store.readInstalled(kit.id)?.installedProjectIds).toEqual(["alpha"]);
    expect(store.readActiveId()).toBe(kit.id);

    await expect(store.removeDefinition(kit.id)).resolves.toBe(true);

    expect(store.readDefinition(kit.id)).toBeNull();
    expect(store.readInstalled(kit.id)).toBeNull();
    expect(store.readActiveId()).toBeNull();
    expect(profile.read().managedExtensions).toEqual(managedExtensions);
  });

  it("hydrates legacy topology without overwriting an earlier queued removal update", async () => {
    const extensionSettings: Record<string, unknown> = {};
    const profile = new ProfileStore({
      extensionSettings,
      saveSettings: () => undefined,
    });
    const store = new KitStore(profile);
    await profile.update((draft) => {
      draft.installedKits.writers = {
        kitId: "writers",
        definitionFingerprint: "a".repeat(64),
        installedProjectIds: ["alpha"],
        missingProjectIds: [],
        status: "installed",
        installedAt: "2026-08-18T00:00:00.000Z",
        lastVerifiedAt: "2026-08-18T00:00:00.000Z",
      };
    });

    const removal = profile.update((draft) => {
      draft.installedKits.writers = {
        kitId: "writers",
        definitionFingerprint: "a".repeat(64),
        installedProjectIds: [],
        missingProjectIds: ["alpha"],
        status: "incomplete",
        installedAt: "2026-08-18T00:00:00.000Z",
        lastVerifiedAt: "2026-08-18T00:01:00.000Z",
      };
    });
    const hydration = store.hydrateDefinitionTopology("writers", ["alpha"], "a".repeat(64));
    await Promise.all([removal, hydration]);

    expect(store.readInstalled("writers")).toMatchObject({
      definitionProjectIds: ["alpha"],
      installedProjectIds: [],
      missingProjectIds: ["alpha"],
      status: "incomplete",
    });
  });
});
