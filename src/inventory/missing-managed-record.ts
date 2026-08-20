import type { ProfileStore } from "../state/profile-store";
import type { InventorySnapshot } from "./inventory-types";
import { ManagedRegistry, normalizeManagedExtensionMap } from "./managed-registry";

export async function forgetMissingManagedRecord({
  projectId,
  inventory,
  store,
}: {
  projectId: string;
  inventory: InventorySnapshot;
  store: ProfileStore;
}): Promise<boolean> {
  const missing = inventory.missingManaged.find(({ record }) => record.projectId === projectId);
  if (!missing) return false;

  const current = normalizeManagedExtensionMap(store.read().managedExtensions)[projectId];
  if (
    !current ||
    current.internalName !== missing.record.internalName ||
    current.folderName !== missing.record.folderName ||
    current.installedAt !== missing.record.installedAt
  ) {
    return false;
  }

  let removed = false;
  await store.update((draft) => {
    const registry = new ManagedRegistry(normalizeManagedExtensionMap(draft.managedExtensions));
    const latest = registry.read()[projectId];
    if (
      !latest ||
      latest.internalName !== missing.record.internalName ||
      latest.folderName !== missing.record.folderName ||
      latest.installedAt !== missing.record.installedAt
    ) {
      return;
    }
    removed = registry.remove(projectId);
    draft.managedExtensions = registry.read();
  });
  return removed;
}
