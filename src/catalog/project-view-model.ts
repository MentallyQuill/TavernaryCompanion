import type { CatalogSnapshot } from "./catalog-client";
import { parseInstallContract, type CatalogProject } from "./catalog-core";
import type { InventorySnapshot } from "../inventory/inventory-types";
import { COMPANION_PROJECT_ID } from "../inventory/managed-registry";

export type ProjectPrimaryAction =
  | {
      kind: "install" | "uninstall";
      label: "Install" | "Uninstall";
      reason: string | null;
    }
  | {
      kind: "current-extension";
      label: "Current extension";
      reason: string;
    }
  | {
      kind: "view-project";
      label: "View project";
      reason: string;
    }
  | {
      kind: "update-required";
      label: "Update Companion";
      reason: string;
    }
  | {
      kind: "manage-in-sillytavern";
      label: "Manage in SillyTavern";
      reason: string;
    };

export interface ProjectCardViewModel {
  id: string;
  name: string;
  summary: string;
  kind: CatalogProject["kind"];
  frontends: string[];
  tavernKeeper: CatalogProject["tavernKeeper"];
  installed: boolean;
  ownership: "managed" | "external" | "absent";
  action: ProjectPrimaryAction;
}

export interface ProjectDetailViewModel extends ProjectCardViewModel {
  canonicalUrl: string;
  primaryFunction: string;
  tags: string[];
  license: CatalogProject["license"];
}

export interface ProjectViewModelContext {
  snapshot: CatalogSnapshot;
  inventory: InventorySnapshot;
}

function installedOwnership(
  projectId: string,
  inventory: InventorySnapshot,
): "managed" | "external" | "absent" {
  if (inventory.managed.some(({ project }) => project.id === projectId)) {
    return "managed";
  }
  if (inventory.external.some(({ project }) => project.id === projectId)) {
    return "external";
  }
  return "absent";
}

function actionFor(
  project: CatalogProject,
  context: ProjectViewModelContext,
  ownership: "managed" | "external" | "absent",
): ProjectPrimaryAction {
  if (project.id === COMPANION_PROJECT_ID) {
    return {
      kind: "current-extension",
      label: "Current extension",
      reason: "Manage Tavernary Companion in SillyTavern.",
    };
  }
  if (context.snapshot.state.startsWith("incompatible")) {
    return {
      kind: "update-required",
      label: "Update Companion",
      reason: "Catalog schema updated; update Companion to restore actions.",
    };
  }
  if (ownership !== "absent") {
    return {
      kind: "uninstall",
      label: "Uninstall",
      reason: ownership === "managed" ? "Managed by Companion" : "Installed outside Companion",
    };
  }
  if (project.kind === "preset") {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Preset installation is not available in V1",
    };
  }
  if (project.kind !== "extension" || !project.frontends.some(({ id }) => id === "sillytavern")) {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Browse-only in Companion",
    };
  }
  try {
    if (!project.install) throw new Error("missing contract");
    parseInstallContract(project.install);
  } catch {
    return {
      kind: "view-project",
      label: "View project",
      reason: "Install contract unavailable",
    };
  }
  return { kind: "install", label: "Install", reason: null };
}

export function toProjectCardViewModel(
  project: CatalogProject,
  context: ProjectViewModelContext,
): ProjectCardViewModel {
  const ownership = installedOwnership(project.id, context.inventory);
  return {
    id: project.id,
    name: project.name,
    summary: project.summary,
    kind: project.kind,
    frontends: project.frontends.map(({ label }) => label),
    tavernKeeper: project.tavernKeeper,
    installed: ownership !== "absent",
    ownership,
    action: actionFor(project, context, ownership),
  };
}

export function toProjectDetailViewModel(
  project: CatalogProject,
  context: ProjectViewModelContext,
): ProjectDetailViewModel {
  return {
    ...toProjectCardViewModel(project, context),
    canonicalUrl: project.canonicalUrl,
    primaryFunction: project.primaryFunction,
    tags: project.tags.map(({ label }) => label),
    license: structuredClone(project.license),
  };
}
