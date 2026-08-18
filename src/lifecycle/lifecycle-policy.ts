import { parseInstallContract } from "../catalog/catalog-core";
import type { InventoryProjectEntry, ManagedInventoryEntry } from "../inventory/inventory-types";
import type { EvaluateLifecycleInput, LifecycleDecision } from "./lifecycle-types";
import { COMPANION_PROJECT_ID } from "./self-protection";

export function evaluateLifecycle({
  operation,
  project,
  context,
}: EvaluateLifecycleInput): LifecycleDecision {
  if (project?.id === COMPANION_PROJECT_ID) {
    return { kind: "rejected", reason: "self-protected" };
  }
  if (!project) return { kind: "rejected", reason: "project-not-found" };
  if (context.operationInProgress) {
    return { kind: "rejected", reason: "operation-in-progress" };
  }
  if (!context.snapshot.canMutate) {
    return { kind: "rejected", reason: "catalog-incompatible" };
  }
  if (!isActionableExtension(project)) {
    return { kind: "rejected", reason: "browse-only-project" };
  }

  const installed = installedEntry(
    project.id,
    context.inventory.managed,
    context.inventory.external,
  );
  if (operation === "install") {
    if (installed) return { kind: "rejected", reason: "already-installed" };
    try {
      if (!project.install) throw new Error("Install contract is missing.");
      const contract = parseInstallContract(project.install);
      if (contract.folderName !== project.install.folderName) {
        return { kind: "rejected", reason: "invalid-install-contract" };
      }
      return { kind: "allowed", operation, contract };
    } catch {
      return { kind: "rejected", reason: "invalid-install-contract" };
    }
  }

  if (!installed) return { kind: "rejected", reason: "not-installed" };
  if (installed.entry.extension.type !== "local") {
    return { kind: "rejected", reason: "host-non-removable" };
  }
  return {
    kind: "allowed",
    operation,
    extension: structuredClone(installed.entry.extension),
    ownership: installed.ownership,
  };
}

function isActionableExtension(project: EvaluateLifecycleInput["project"]): boolean {
  return Boolean(
    project?.kind === "extension" && project.frontends.some(({ id }) => id === "sillytavern"),
  );
}

function installedEntry(
  projectId: string,
  managed: ManagedInventoryEntry[],
  external: InventoryProjectEntry[],
):
  | { ownership: "managed"; entry: ManagedInventoryEntry }
  | { ownership: "external"; entry: InventoryProjectEntry }
  | null {
  const managedEntry = managed.find(({ project }) => project.id === projectId);
  if (managedEntry) return { ownership: "managed", entry: managedEntry };
  const externalEntry = external.find(({ project }) => project.id === projectId);
  return externalEntry ? { ownership: "external", entry: externalEntry } : null;
}
