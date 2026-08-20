import type { InventorySnapshot } from "../inventory/inventory-types";
import { COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import type { ProjectPrimaryAction } from "./project-view-model";

export interface InstalledRowViewModel {
  id: string;
  name: string;
  detail: string;
  internalName: string | null;
  canonicalUrl: string | null;
  enabled: boolean | null;
  toggleable: boolean;
  action: ProjectPrimaryAction;
}

export interface InstalledSectionViewModel {
  id: "managed" | "external" | "unknown" | "attention";
  title:
    | "Managed by Companion"
    | "Installed outside Companion"
    | "Not found in current catalog"
    | "Previously managed";
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
        internalName: extension.internalName,
        canonicalUrl: project.canonicalUrl,
        enabled: extension.enabled,
        toggleable: canToggle(project.id, extension.internalName),
        action: installedAction(extension.type, "Managed by Companion"),
      })),
    },
    {
      id: "external",
      title: "Installed outside Companion",
      rows: inventory.external.map(({ project, extension }) => ({
        id: project.id,
        name: project.name,
        detail: extension.folderName,
        internalName: extension.internalName,
        canonicalUrl: project.canonicalUrl,
        enabled: extension.enabled,
        toggleable: canToggle(project.id, extension.internalName),
        action: installedAction(extension.type, "Installed outside Companion"),
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
        internalName: extension.internalName,
        canonicalUrl: null,
        enabled: extension.enabled,
        toggleable: canToggle(extension.internalName, extension.internalName),
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "No unambiguous Tavernary project identity.",
        },
      })),
    },
    {
      id: "attention",
      title: "Previously managed",
      rows: inventory.missingManaged.map(({ record, project }) => ({
        id: record.projectId,
        name: project?.name ?? record.folderName,
        detail:
          "Previously managed by Companion, but no longer installed in this SillyTavern profile.",
        internalName: record.internalName,
        canonicalUrl: project?.canonicalUrl ?? null,
        enabled: null,
        toggleable: false,
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "Reconcile the missing extension in SillyTavern.",
        },
      })),
    },
  ];
}

function canToggle(projectId: string, internalName: string): boolean {
  return (
    projectId !== COMPANION_PROJECT_ID &&
    !/(?:^|[/_-])tavernary[ _-]?companion(?:$|[/_-])/iu.test(internalName)
  );
}

function installedAction(
  extensionType: "local" | "global",
  uninstallReason: string,
): ProjectPrimaryAction {
  return extensionType === "global"
    ? {
        kind: "manage-in-sillytavern",
        label: "Manage in SillyTavern",
        reason: "Global extensions are managed by SillyTavern.",
      }
    : { kind: "uninstall", label: "Uninstall", reason: uninstallReason };
}
