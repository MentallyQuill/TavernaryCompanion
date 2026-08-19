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
  tags: string[];
  licenseLabel: string;
  attributionLabel: string | null;
  primaryFunction: string;
  activity: {
    latestSourceActivityAt: string | null;
    activeWeeks12: number | null;
    weeklyActivity: boolean[] | null;
    dormant: boolean;
  };
  tavernKeeper: CatalogProject["tavernKeeper"];
  installed: boolean;
  ownership: "managed" | "external" | "absent";
  kitSelectable: boolean;
  action: ProjectPrimaryAction;
}

export interface ProjectDetailViewModel extends ProjectCardViewModel {
  canonicalUrl: string;
  primaryFunction: string;
  tags: string[];
  license: CatalogProject["license"];
  metadataStatus: CatalogProject["metadataStatus"];
  sourceStatus: CatalogProject["sourceStatus"];
  catalogedAt: string;
  latestReleaseAt: string | null;
  refreshedAt: string | null;
  attribution: CatalogProject["attribution"];
  fork: CatalogProject["fork"];
  kitReferences: Array<{ id: string; title: string }>;
}

export interface ProjectViewModelContext {
  snapshot: CatalogSnapshot;
  inventory: InventorySnapshot;
  kits?: Array<{ id: string; title: string; components: Array<{ projectId: string }> }>;
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
    tags: project.tags.map(({ label }) => label),
    licenseLabel: project.license.label,
    attributionLabel: project.attribution ? `By ${project.attribution.owner.login}` : null,
    primaryFunction: primaryFunctionLabel(project.primaryFunction),
    activity: {
      latestSourceActivityAt: project.activity.latestSourceActivityAt,
      activeWeeks12: project.activity.activeWeeks12,
      weeklyActivity: project.activity.weeklyActivity,
      dormant: project.activity.dormant,
    },
    tavernKeeper: project.tavernKeeper,
    installed: ownership !== "absent",
    ownership,
    kitSelectable:
      project.id !== COMPANION_PROJECT_ID &&
      project.kind === "extension" &&
      project.frontends.some(({ id }) => id === "sillytavern") &&
      Boolean(project.install),
    action: actionFor(project, context, ownership),
  };
}

function primaryFunctionLabel(value: string): string {
  const labels: Record<string, string> = {
    "memory-retrieval": "Memory & Retrieval",
    "generation-reasoning": "Generation & Reasoning",
    "character-worldbuilding": "Character & Worldbuilding",
    "rpg-systems": "RPG Systems & Suites",
    "interface-workflow": "Interface & Workflow",
    "developer-infrastructure": "Developer Infrastructure",
  };
  return labels[value] ?? value;
}

export function toProjectDetailViewModel(
  project: CatalogProject,
  context: ProjectViewModelContext,
): ProjectDetailViewModel {
  return {
    ...toProjectCardViewModel(project, context),
    canonicalUrl: project.canonicalUrl,
    primaryFunction: primaryFunctionLabel(project.primaryFunction),
    tags: project.tags.map(({ label }) => label),
    license: structuredClone(project.license),
    metadataStatus: project.metadataStatus,
    sourceStatus: project.sourceStatus,
    catalogedAt: project.catalogedAt,
    latestReleaseAt: project.latestReleaseAt,
    refreshedAt: project.refreshedAt,
    attribution: structuredClone(project.attribution),
    fork: structuredClone(project.fork),
    kitReferences: (context.kits ?? [])
      .filter((kit) => kit.components.some(({ projectId }) => projectId === project.id))
      .map(({ id, title }) => ({ id, title })),
  };
}
