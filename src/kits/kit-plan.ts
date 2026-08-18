import type { TavernKeeperFreshness } from "../catalog/catalog-core";

export type KitOperation = "install" | "activate" | "deactivate" | "uninstall";

export interface KitProjectStep {
  projectId: string;
  projectName: string;
  internalName: string | null;
}

export interface KitWarning {
  projectId: string;
  projectName: string;
  severity: "material" | "high";
  freshness: TavernKeeperFreshness;
  reportUrl: string | null;
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
  inventoryFingerprint: string;
  requiredProjectIds: string[];
  install: KitProjectStep[];
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
  for (const value of Object.values(plan)) {
    if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "object" && item) Object.freeze(item);
      Object.freeze(value);
    }
  }
  return Object.freeze(plan);
}
