import type { TavernKeeperFreshness } from "../catalog/catalog-core";
import type { InstallTargetChoice } from "../lifecycle/install-target-resolver";

export type KitOperation = "install" | "activate" | "deactivate" | "uninstall";

export interface KitProjectStep {
  projectId: string;
  projectName: string;
  internalName: string | null;
}

export interface KitInstallStep extends KitProjectStep {
  targetChoice: InstallTargetChoice | null;
}

export interface KitWarning {
  projectId: string;
  projectName: string;
  severity: "material" | "high";
  freshness: TavernKeeperFreshness;
  reportUrl: string | null;
  scannedSha: string | null;
}

export interface KitIssue {
  code:
    | "catalog-incompatible"
    | "project-unavailable"
    | "invalid-install-contract"
    | "companion-member";
  projectId: string | null;
  message: string;
}

export interface KitPlan {
  id: string;
  operation: KitOperation;
  kitId: string;
  catalogGeneratedAt: string;
  catalogBinding: string;
  inventoryFingerprint: string;
  requiredProjectIds: string[];
  actionableProjectIds: string[];
  installTargetsPrepared: boolean;
  install: KitInstallStep[];
  enable: KitProjectStep[];
  disable: KitProjectStep[];
  remove: KitProjectStep[];
  alreadyManaged: KitProjectStep[];
  externalContext: KitProjectStep[];
  contextOnly: KitProjectStep[];
  keptForOtherKits: KitProjectStep[];
  warnings: KitWarning[];
  blockingIssues: KitIssue[];
  reloadRequired: boolean;
}

export function freezeKitPlan(plan: KitPlan): Readonly<KitPlan> {
  return deepFreeze(plan);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
