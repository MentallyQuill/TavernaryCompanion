import type { KitOperation } from "./kit-plan";

export type KitProjectResultStatus = "verified" | "failed" | "kept" | "external" | "context";

export interface KitProjectResult {
  projectId: string;
  action: "install" | "enable" | "disable" | "remove" | "keep" | "context";
  status: KitProjectResultStatus;
  message: string;
  retryable: boolean;
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
  projects: KitProjectResult[];
  keptForOtherKits: string[];
}

export interface KitApproval {
  planId: string;
  inventoryFingerprint: string;
  catalogGeneratedAt: string;
  acceptedWarningProjectIds: string[];
}
