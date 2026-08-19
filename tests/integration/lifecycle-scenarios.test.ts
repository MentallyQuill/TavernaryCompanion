import { expect, it, vi } from "vitest";
import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import { createLifecycleCoordinator } from "../../src/lifecycle/lifecycle-coordinator";
import { ProfileStore } from "../../src/state/profile-store";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { createFakeHost } from "../helpers/fake-host";

it("runs disclosure, verified install, and exact managed removal as one service journey", async () => {
  const project = catalogProjectFixture({ id: "harmless", folderName: "HarmlessFixture" });
  const catalog = { ...catalogFixture(), projects: [project] };
  const snapshot: CatalogSnapshot = {
    state: "ready-current",
    canMutate: true,
    checkedAt: null,
    catalog,
  };
  const host = createFakeHost({
    installResults: {
      [project.install!.repositoryUrl]: {
        internalName: "third-party/HarmlessFixture",
        folderName: "HarmlessFixture",
        enabled: true,
        type: "local",
        manifest: null,
      },
    },
  });
  const store = new ProfileStore({ extensionSettings: {}, saveSettingsDebounced: () => undefined });
  const confirm = vi.fn(async () => true);
  const lifecycle = createLifecycleCoordinator({
    host,
    store,
    getSnapshot: () => snapshot,
    confirm,
    now: () => "2026-08-18T00:00:00.000Z",
    createId: () => "receipt",
  });
  const prepared = await lifecycle.prepareInstall("harmless");
  if (prepared.kind !== "single") throw new Error("Expected one prepared install target.");
  expect((await lifecycle.install("harmless", prepared.selection)).status).toBe("succeeded");
  expect(confirm).toHaveBeenCalledOnce();
  expect((await lifecycle.remove("harmless")).status).toBe("succeeded");
  expect(host.calls.filter(({ operation }) => operation === "remove")).toEqual([
    expect.objectContaining({ internalName: "third-party/HarmlessFixture", type: "local" }),
  ]);
});
