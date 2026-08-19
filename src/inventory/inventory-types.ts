import type { CatalogProject } from "../catalog/catalog-core";
import type { HostExtension } from "../host/host-types";
import type { ManagedInstallProvenance } from "../lifecycle/install-target";

export type ManagedInstallOrigin = "individual" | "kit";

export interface ManagedExtensionRecord {
  projectId: string;
  internalName: string;
  folderName: string;
  installedAt: string;
  installedBy: ManagedInstallOrigin;
  provenance?: ManagedInstallProvenance;
}

export type ManagedExtensionMap = Record<string, ManagedExtensionRecord>;

export interface InventoryProjectEntry {
  project: CatalogProject;
  extension: HostExtension;
}

export interface ManagedInventoryEntry extends InventoryProjectEntry {
  record: ManagedExtensionRecord;
}

export interface UnknownInventoryEntry {
  extension: HostExtension;
  reason: "folder-not-in-catalog" | "ambiguous-folder";
}

export interface MissingManagedEntry {
  record: ManagedExtensionRecord;
  project: CatalogProject | null;
}

export interface InventorySnapshot {
  managed: ManagedInventoryEntry[];
  external: InventoryProjectEntry[];
  unknown: UnknownInventoryEntry[];
  missingManaged: MissingManagedEntry[];
}
