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
  selectionEligible: boolean;
  selectionDisabledReason: string | null;
}

export interface InstalledSectionViewModel {
  id: "managed" | "external" | "ambiguous" | "unknown";
  title:
    | "Managed by Companion"
    | "Installed outside Companion"
    | "Multiple matches in current catalog"
    | "Not found in current catalog";
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
        ...selectionEligibility(project.id, extension.internalName, extension.type),
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
        ...selectionEligibility(project.id, extension.internalName, extension.type),
      })),
    },
    {
      id: "ambiguous",
      title: "Multiple matches in current catalog",
      rows: unknownRows(
        inventory.unknown.filter(({ reason }) => reason === "ambiguous-folder"),
        "Multiple Tavernary projects use this extension folder, and Companion could not verify which repository is installed.",
      ),
    },
    {
      id: "unknown",
      title: "Not found in current catalog",
      rows: unknownRows(
        inventory.unknown.filter(({ reason }) => reason === "folder-not-in-catalog"),
        "No Tavernary project uses this extension folder.",
      ),
    },
  ];
}

function unknownRows(
  entries: InventorySnapshot["unknown"],
  reason: string,
): InstalledRowViewModel[] {
  return entries.map(({ extension }) => ({
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
      reason,
    },
    selectionEligible: false,
    selectionDisabledReason: "No unambiguous Tavernary project identity.",
  }));
}

function selectionEligibility(
  projectId: string,
  internalName: string,
  extensionType: "local" | "global",
): Pick<InstalledRowViewModel, "selectionEligible" | "selectionDisabledReason"> {
  if (!canToggle(projectId, internalName)) {
    return {
      selectionEligible: false,
      selectionDisabledReason: "Tavernary Companion cannot manage itself.",
    };
  }
  if (extensionType === "global") {
    return {
      selectionEligible: false,
      selectionDisabledReason: "Global extensions are managed by SillyTavern.",
    };
  }
  return { selectionEligible: true, selectionDisabledReason: null };
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
