import type { InventorySnapshot } from "../inventory/inventory-types";
import type { InstalledKitStateV1 } from "./kit-types";

export type ReconciledKitStatus =
  "saved" | "installed" | "active" | "incomplete" | "drifted" | "changedOnTavernary";

export function reconcileKitStatus({
  kitId,
  definitionFingerprint,
  published,
  installed,
  inventory,
  activeKitId,
}: {
  kitId: string;
  definitionFingerprint: string;
  published: boolean;
  installed: InstalledKitStateV1 | null;
  inventory: InventorySnapshot;
  activeKitId: string | null;
}): ReconciledKitStatus {
  if (!installed) return "saved";
  if (installed.definitionFingerprint !== definitionFingerprint) {
    return published ? "changedOnTavernary" : "drifted";
  }
  if (installed.status === "drifted") return "drifted";
  const present = new Set([
    ...inventory.managed.map(({ project }) => project.id),
    ...inventory.external.map(({ project }) => project.id),
  ]);
  if (
    installed.status === "incomplete" ||
    installed.missingProjectIds.length > 0 ||
    installed.installedProjectIds.some((projectId) => !present.has(projectId))
  ) {
    return "incomplete";
  }
  if (activeKitId === kitId) {
    const managedById = new Map(
      inventory.managed.map(({ project, extension }) => [project.id, extension]),
    );
    if (
      installed.installedProjectIds.some((projectId) => {
        const managed = managedById.get(projectId);
        return managed ? !managed.enabled : false;
      })
    ) {
      return "drifted";
    }
    return "active";
  }
  return "installed";
}
