import { describe, expect, it, vi } from "vitest";

import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import { createLifecycleCoordinator } from "../../src/lifecycle/lifecycle-coordinator";
import { ProfileStore } from "../../src/state/profile-store";
import { createDefaultProfileState } from "../../src/state/profile-state";
import { createFakeHost } from "../helpers/fake-host";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";

function setup({
  ownership = "managed",
  type = "local",
}: {
  ownership?: "managed" | "external";
  type?: "local" | "global";
} = {}) {
  const project = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  project.name = "Alpha";
  const catalog = catalogFixture();
  catalog.projects = [project];
  const snapshot: CatalogSnapshot = {
    state: "ready-current",
    canMutate: true,
    checkedAt: null,
    catalog,
  };
  const extension = {
    internalName: "third-party/Alpha",
    folderName: "Alpha",
    enabled: true,
    type,
    manifest: null,
  };
  const state = createDefaultProfileState();
  state.trustAcknowledgedAt = "2026-08-18T00:00:00.000Z";
  if (ownership === "managed") {
    state.managedExtensions.alpha = {
      projectId: "alpha",
      internalName: extension.internalName,
      folderName: extension.folderName,
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "individual",
    };
  }
  state.installedKits.daily = {
    kitId: "daily",
    definitionFingerprint: "a".repeat(64),
    definitionProjectIds: ["alpha"],
    installedProjectIds: ["alpha"],
    missingProjectIds: [],
    status: "installed",
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  };
  state.activeKitId = "daily";
  const extensionSettings = { tavernaryCompanion: state };
  const store = new ProfileStore({ extensionSettings, saveSettingsDebounced: vi.fn() });
  const host = createFakeHost({ extensions: [extension] });
  const coordinator = createLifecycleCoordinator({
    host,
    store,
    getSnapshot: () => snapshot,
    confirm: vi.fn(async () => true),
    now: () => "2026-08-18T10:00:00.000Z",
    createId: () => "receipt-remove",
  });
  return { coordinator, host, store, extension };
}

describe("remove lifecycle", () => {
  it("removes the exact managed extension and marks referenced Kits incomplete", async () => {
    const { coordinator, host, store } = setup();
    const impact = await coordinator.previewRemoval("alpha");
    expect(impact.activeKitAffected).toBe(true);

    const receipt = await coordinator.remove("alpha");

    expect(host.calls.map(({ operation }) => operation)).toEqual([
      "discover",
      "discover",
      "remove",
      "discover",
    ]);
    expect(receipt.status).toBe("succeeded");
    expect(store.read().managedExtensions).toEqual({});
    expect(store.read().installedKits.daily).toMatchObject({
      status: "incomplete",
      installedProjectIds: [],
      missingProjectIds: ["alpha"],
    });
    expect(store.read().activeKitId).toBe("daily");
  });

  it("allows explicit external removal without creating ownership", async () => {
    const { coordinator, host, store, extension } = setup({ ownership: "external" });
    const receipt = await coordinator.remove("alpha");

    expect(receipt.status).toBe("succeeded");
    expect(host.calls).toContainEqual({
      operation: "remove",
      internalName: extension.internalName,
      type: "local",
    });
    expect(store.read().managedExtensions).toEqual({});
  });

  it("rejects unknown and global extensions without a remove request", async () => {
    const global = setup({ type: "global" });
    expect((await global.coordinator.remove("alpha")).status).toBe("rejected");
    expect(global.host.calls.some(({ operation }) => operation === "remove")).toBe(false);

    const unknown = setup();
    expect((await unknown.coordinator.remove("not-in-catalog")).status).toBe("rejected");
    expect(unknown.host.calls.some(({ operation }) => operation === "remove")).toBe(false);
  });

  it("does not clear state when the exact identity remains after host removal", async () => {
    const fixture = setup();
    vi.spyOn(fixture.host, "remove").mockResolvedValue(undefined);
    const receipt = await fixture.coordinator.remove("alpha");

    expect(receipt.status).toBe("verification-failed");
    expect(fixture.store.read().managedExtensions).toHaveProperty("alpha");
    expect(fixture.store.read().installedKits.daily).toMatchObject({ status: "installed" });
  });
});
