import { describe, expect, it } from "vitest";

import { KitStore } from "../../src/kits/kit-store";
import { ProfileStore } from "../../src/state/profile-store";

function createStore() {
  const extensionSettings: Record<string, unknown> = {};
  return new KitStore(
    new ProfileStore({ extensionSettings, saveSettingsDebounced: () => undefined }),
    {
      uuid: () => "018f6f42-7142-7a1f-9b52-9d3a7d548120",
      now: () => "2026-08-18T12:00:00.000Z",
    },
  );
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

  it("records installed state separately and maintains one active Kit", async () => {
    const store = createStore();
    const kit = await store.create({ title: "Writer", description: "", projectIds: ["alpha"] });
    await store.recordInstalledState({
      kitId: kit.id,
      definitionFingerprint: "a".repeat(64),
      installedProjectIds: ["alpha"],
      missingProjectIds: [],
      status: "installed",
      installedAt: "2026-08-18T12:00:00.000Z",
      lastVerifiedAt: "2026-08-18T12:00:00.000Z",
    });
    await store.setActive(kit.id);
    expect(store.readActiveId()).toBe(kit.id);
    expect(store.readInstalled(kit.id)?.installedProjectIds).toEqual(["alpha"]);
  });
});
