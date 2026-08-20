import { expect, it, vi } from "vitest";

import { ProfileStore } from "../../src/state/profile-store";

it("reads defaults and writes cloned state to the SillyTavern namespace", async () => {
  const extensionSettings: Record<string, unknown> = {};
  const saveSettings = vi.fn();
  const store = new ProfileStore({ extensionSettings, saveSettings });

  expect(store.read().preferences).toEqual({ route: "projects", density: "standard" });

  await store.update((draft) => {
    draft.preferences.route = "kits";
  });

  expect(extensionSettings.tavernaryCompanion).toMatchObject({
    formatVersion: 1,
    preferences: { route: "kits", density: "standard" },
  });
  expect(saveSettings).toHaveBeenCalledTimes(1);

  const hostCopy = extensionSettings.tavernaryCompanion as {
    preferences: { route: "projects" | "kits" };
  };
  hostCopy.preferences.route = "projects";
  expect(store.read().preferences.route).toBe("kits");
});

it("serializes concurrent updates in invocation order and notifies once per commit", async () => {
  const extensionSettings: Record<string, unknown> = {};
  const saveSettings = vi.fn();
  const store = new ProfileStore({ extensionSettings, saveSettings });
  const snapshots: string[] = [];
  store.subscribe((state) =>
    snapshots.push(`${state.preferences.route}:${state.preferences.density}`),
  );

  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const first = store.update(async (draft) => {
    draft.preferences.route = "kits";
    await firstGate;
  });
  const second = store.update((draft) => {
    draft.preferences.density = "compact";
  });

  await Promise.resolve();
  expect(saveSettings).not.toHaveBeenCalled();
  releaseFirst();
  await Promise.all([first, second]);

  expect(store.read().preferences).toEqual({ route: "kits", density: "compact" });
  expect(snapshots).toEqual(["kits:standard", "kits:compact"]);
  expect(saveSettings).toHaveBeenCalledTimes(2);
});

it("publishes profile state only after the immediate settings save completes", async () => {
  const extensionSettings: Record<string, unknown> = {};
  let finishSave!: () => void;
  const savePending = new Promise<void>((resolve) => {
    finishSave = resolve;
  });
  const subscriber = vi.fn();
  const store = new ProfileStore({
    extensionSettings,
    saveSettings: () => savePending,
  });
  store.subscribe(subscriber);

  const updating = store.update((draft) => {
    draft.preferences.route = "kits";
  });
  await Promise.resolve();

  expect(store.read().preferences.route).toBe("projects");
  expect(subscriber).not.toHaveBeenCalled();

  finishSave();
  await updating;

  expect(store.read().preferences.route).toBe("kits");
  expect(subscriber).toHaveBeenCalledOnce();
});

it("rolls back memory and host settings when persistence fails", async () => {
  const extensionSettings: Record<string, unknown> = {};
  const store = new ProfileStore({
    extensionSettings,
    saveSettings: vi.fn().mockRejectedValue(new Error("storage unavailable")),
  });

  await expect(
    store.update((draft) => {
      draft.preferences.route = "installed";
    }),
  ).rejects.toThrow("storage unavailable");

  expect(store.read().preferences.route).toBe("projects");
  expect(extensionSettings).not.toHaveProperty("tavernaryCompanion");
});
