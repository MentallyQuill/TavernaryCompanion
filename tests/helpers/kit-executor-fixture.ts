import type { CatalogV7 } from "../../src/catalog/catalog-core";
import type { HostExtension } from "../../src/host/host-types";
import { reconcileInventory } from "../../src/inventory/inventory-reconciler";
import { normalizeManagedExtensionMap } from "../../src/inventory/managed-registry";
import type { InstalledKitStateV1 } from "../../src/kits/kit-types";
import { createKitExecutor } from "../../src/kits/kit-executor";
import type { KitPlan } from "../../src/kits/kit-plan";
import type { KitApproval } from "../../src/kits/kit-receipt";
import { KitStore } from "../../src/kits/kit-store";
import { OperationLock } from "../../src/lifecycle/operation-lock";
import { ProfileStore } from "../../src/state/profile-store";
import { createFakeHost, type FakeHostOptions } from "./fake-host";

export function extension(folderName: string, enabled = true): HostExtension {
  return {
    internalName: `third-party/${folderName}`,
    folderName,
    enabled,
    type: "local",
    manifest: null,
  };
}

export async function executorFixture(catalog: CatalogV7, hostOptions: FakeHostOptions = {}) {
  const extensionSettings: Record<string, unknown> = {};
  const profile = new ProfileStore({ extensionSettings, saveSettingsDebounced: () => undefined });
  const kits = new KitStore(profile, { now: () => "2026-08-18T12:00:00.000Z" });
  const host = createFakeHost(hostOptions);
  let currentFingerprint = "fixture-fingerprint";
  const executor = createKitExecutor({
    host,
    profile,
    kits,
    lock: new OperationLock(),
    getCatalog: () => catalog,
    getInventoryFingerprint: () => currentFingerprint,
    now: () => "2026-08-18T12:00:00.000Z",
    operationId: () => "operation-1",
  });
  return {
    executor,
    host,
    profile,
    kits,
    setFingerprint(value: string) {
      currentFingerprint = value;
    },
    async inventory() {
      return reconcileInventory({
        projects: catalog.projects,
        hostExtensions: await host.discover(),
        managed: normalizeManagedExtensionMap(profile.read().managedExtensions),
      });
    },
    async recordInstalled(
      kitId: string,
      projectIds: string[],
      status: InstalledKitStateV1["status"] = "installed",
    ) {
      await kits.recordInstalledState({
        kitId,
        definitionFingerprint: "a".repeat(64),
        installedProjectIds: projectIds,
        missingProjectIds: [],
        status,
        installedAt: "2026-08-18T00:00:00.000Z",
        lastVerifiedAt: "2026-08-18T00:00:00.000Z",
      });
    },
  };
}

export function approve(plan: Readonly<KitPlan>): KitApproval {
  return {
    planId: plan.id,
    inventoryFingerprint: plan.inventoryFingerprint,
    catalogGeneratedAt: plan.catalogGeneratedAt,
    acceptedWarningProjectIds: plan.warnings.map(({ projectId }) => projectId),
  };
}
