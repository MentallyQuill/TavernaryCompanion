import type { CatalogSnapshot } from "../catalog/catalog-client";
import type { CatalogProject, InstallContract } from "../catalog/catalog-core";
import type { HostExtension } from "../host/host-types";
import type { InventorySnapshot } from "../inventory/inventory-types";

export type LifecycleOperation = "install" | "remove";

export type LifecycleRejection =
  | "self-protected"
  | "project-not-found"
  | "catalog-incompatible"
  | "browse-only-project"
  | "invalid-install-contract"
  | "already-installed"
  | "not-installed"
  | "host-non-removable"
  | "operation-in-progress";

export type LifecycleDecision =
  | { kind: "rejected"; reason: LifecycleRejection }
  | { kind: "confirmation-required"; operation: LifecycleOperation }
  | { kind: "allowed"; operation: "install"; contract: InstallContract }
  | {
      kind: "allowed";
      operation: "remove";
      extension: HostExtension;
      ownership: "managed" | "external";
    };

export interface LifecyclePolicyContext {
  snapshot: CatalogSnapshot;
  inventory: InventorySnapshot;
  operationInProgress?: boolean;
}

export interface EvaluateLifecycleInput {
  operation: LifecycleOperation;
  project: CatalogProject | null;
  context: LifecyclePolicyContext;
}
