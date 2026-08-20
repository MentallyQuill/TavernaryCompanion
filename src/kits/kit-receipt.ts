import type { KitOperation } from "./kit-plan";
import type { ManagedInstallProvenance } from "../lifecycle/install-target";
import type { KitInstallTargetSelection } from "./kit-install-targets";

export type KitProjectResultStatus =
  "verified" | "failed" | "untouched" | "kept" | "external" | "context";

export interface KitProjectResult {
  projectId: string;
  action: "install" | "enable" | "disable" | "remove" | "keep" | "context";
  status: KitProjectResultStatus;
  message: string;
  retryable: boolean;
  installProvenance?: ManagedInstallProvenance;
}

export interface KitReceipt {
  formatVersion: 1;
  kind: "kit-operation";
  id: string;
  planId: string;
  operation: KitOperation;
  kitId: string;
  startedAt: string;
  completedAt: string;
  outcome: "completed" | "partial" | "failed" | "interrupted";
  previousActiveKitId: string | null;
  activeKitId: string | null;
  reloadRequired: boolean;
  projects: KitProjectResult[];
  keptForOtherKits: string[];
}

export interface KitApproval {
  planId: string;
  inventoryFingerprint: string;
  catalogGeneratedAt: string;
  catalogBinding: string;
  acceptedWarningProjectIds: string[];
  selectedInstallTargets: KitInstallTargetSelection[];
  installTargetBinding: string;
}
