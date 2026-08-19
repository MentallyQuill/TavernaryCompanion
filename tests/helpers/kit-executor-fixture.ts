import type { CatalogV7 } from "../../src/catalog/catalog-core";
import type { HostExtension } from "../../src/host/host-types";
import { reconcileInventory } from "../../src/inventory/inventory-reconciler";
import { normalizeManagedExtensionMap } from "../../src/inventory/managed-registry";
import type { InstalledKitStateV1 } from "../../src/kits/kit-types";
import { createKitExecutor } from "../../src/kits/kit-executor";
import type { KitPlan } from "../../src/kits/kit-plan";
import type { KitApproval } from "../../src/kits/kit-receipt";
import {
  computeInstallTargetBinding,
  initialInstallTargetSelections,
  prepareKitInstallTargets,
  type KitInstallTargetSelection,
} from "../../src/kits/kit-install-targets";
import { KitStore } from "../../src/kits/kit-store";
import { OperationLock } from "../../src/lifecycle/operation-lock";
import { InstallTargetFallbackBroker } from "../../src/lifecycle/install-target-fallback-broker";
import type { CatalogProject } from "../../src/catalog/catalog-core";
import type { TrustPrompt } from "../../src/trust/trust-types";
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

export async function executorFixture(
  catalog: CatalogV7,
  hostOptions: FakeHostOptions = {},
  options: { confirm?: (prompt: TrustPrompt, project: CatalogProject) => Promise<boolean> } = {},
) {
  const extensionSettings: Record<string, unknown> = {};
  const profile = new ProfileStore({ extensionSettings, saveSettingsDebounced: () => undefined });
  const kits = new KitStore(profile, { now: () => "2026-08-18T12:00:00.000Z" });
  const host = createFakeHost(hostOptions);
  let currentFingerprint = "fixture-fingerprint";
  let currentCatalog = catalog;
  const fingerprintCheckOperations: Array<string | null> = [];
  const lock = new OperationLock();
  const fallbacks = new InstallTargetFallbackBroker();
  const executor = createKitExecutor({
    host,
    profile,
    kits,
    lock,
    getCatalog: () => currentCatalog,
    getInventoryFingerprint: () => {
      fingerprintCheckOperations.push(lock.read()?.operationId ?? null);
      return currentFingerprint;
    },
    fallbacks,
    confirm: options.confirm ?? (async () => true),
    now: () => "2026-08-18T12:00:00.000Z",
    operationId: () => "operation-1",
  });
  return {
    executor,
    host,
    profile,
    kits,
    lock,
    fallbacks,
    fingerprintCheckOperations,
    setFingerprint(value: string) {
      currentFingerprint = value;
    },
    setCatalog(value: CatalogV7) {
      currentCatalog = value;
    },
    prepare(plan: Readonly<KitPlan>) {
      return prepareKitInstallTargets({
        plan,
        catalog: currentCatalog,
        host,
        now: () => "2026-08-18T12:00:00.000Z",
      });
    },
    async inventory() {
      return reconcileInventory({
        projects: currentCatalog.projects,
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
        definitionProjectIds: projectIds,
        installedProjectIds: projectIds,
        missingProjectIds: [],
        status,
        installedAt: "2026-08-18T00:00:00.000Z",
        lastVerifiedAt: "2026-08-18T00:00:00.000Z",
      });
    },
  };
}

export function approve(
  plan: Readonly<KitPlan>,
  selectedInstallTargets: KitInstallTargetSelection[] = initialInstallTargetSelections(plan),
): KitApproval {
  return {
    planId: plan.id,
    inventoryFingerprint: plan.inventoryFingerprint,
    catalogGeneratedAt: plan.catalogGeneratedAt,
    catalogBinding: plan.catalogBinding,
    acceptedWarningProjectIds: plan.warnings.map(({ projectId }) => projectId),
    selectedInstallTargets,
    installTargetBinding: computeInstallTargetBinding(selectedInstallTargets),
  };
}
