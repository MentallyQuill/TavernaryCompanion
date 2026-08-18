import type { InventorySnapshot } from "../inventory/inventory-types";
import type { ProjectPrimaryAction } from "./project-view-model";

export interface InstalledRowViewModel {
  id: string;
  name: string;
  detail: string;
  enabled: boolean | null;
  action: ProjectPrimaryAction;
}

export interface InstalledSectionViewModel {
  id: "managed" | "external" | "unknown" | "attention";
  title:
    | "Managed by Companion"
    | "Installed outside Companion"
    | "Not found in current catalog"
    | "Needs attention";
  rows: InstalledRowViewModel[];
}

export function toInstalledSectionViewModel(
  inventory: InventorySnapshot,
): InstalledSectionViewModel[] {
  return [
    {
      id: "managed",
      title: "Managed by Companion",
      rows: inventory.managed.map(({ project, extension }) => ({
        id: project.id,
        name: project.name,
        detail: extension.folderName,
        enabled: extension.enabled,
        action: {
          kind: "uninstall",
          label: "Uninstall",
          reason: "Managed by Companion",
        },
      })),
    },
    {
      id: "external",
      title: "Installed outside Companion",
      rows: inventory.external.map(({ project, extension }) => ({
        id: project.id,
        name: project.name,
        detail: extension.folderName,
        enabled: extension.enabled,
        action: {
          kind: "uninstall",
          label: "Uninstall",
          reason: "Installed outside Companion",
        },
      })),
    },
    {
      id: "unknown",
      title: "Not found in current catalog",
      rows: inventory.unknown.map(({ extension }) => ({
        id: extension.internalName,
        name:
          typeof extension.manifest?.display_name === "string"
            ? extension.manifest.display_name
            : extension.folderName,
        detail: extension.internalName,
        enabled: extension.enabled,
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "No unambiguous Tavernary project identity.",
        },
      })),
    },
    {
      id: "attention",
      title: "Needs attention",
      rows: inventory.missingManaged.map(({ record, project }) => ({
        id: record.projectId,
        name: project?.name ?? record.folderName,
        detail: "Managed record is missing from SillyTavern.",
        enabled: null,
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "Reconcile the missing extension in SillyTavern.",
        },
      })),
    },
  ];
}
