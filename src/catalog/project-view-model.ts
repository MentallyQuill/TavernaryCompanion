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
  displayName: string;
  canonicalUrl: string;
  summary: string;
  kind: CatalogProject["kind"];
  frontends: string[];
  tags: string[];
  tagChips: Array<{ label: string; facet: CatalogProject["tags"][number]["facet"] }>;
  licenseLabel: string;
  licenseStatus: CatalogProject["license"]["status"];
  attributionLabel: string | null;
  primaryFunctionId: string;
  primaryFunction: string;
  activity: {
    latestSourceActivityAt: string | null;
    latestSourceActivityLabel: string | null;
    latestSourceActivityFreshness: number;
    activeWeeks12: number | null;
    weeklyActivity: boolean[] | null;
    evidenceStatus: NonNullable<CatalogProject["activity"]["evidenceStatus"]>;
    dormant: boolean;
  };
  communityAggregate: number | null;
  repositorySizeLabel: string | null;
  preset: {
    versionLabel: string | null;
    publishedLabel: string | null;
    sizeLabel: string | null;
    modelFamilies: string[];
    completionFormats: string[];
  } | null;
  tavernKeeper: CatalogProject["tavernKeeper"];
  installed: boolean;
  ownership: "managed" | "external" | "absent";
  kitSelectable: boolean;
  action: ProjectPrimaryAction;
}

export interface ProjectViewModelContext {
  snapshot: CatalogSnapshot;
  inventory: InventorySnapshot;
  now?: string;
}

interface InstalledState {
  ownership: "managed" | "external" | "absent";
  removable: boolean;
}

function installedState(projectId: string, inventory: InventorySnapshot): InstalledState {
  const managed = inventory.managed.find(({ project }) => project.id === projectId);
  if (managed) {
    return { ownership: "managed", removable: managed.extension.type === "local" };
  }
  const external = inventory.external.find(({ project }) => project.id === projectId);
  if (external) {
    return { ownership: "external", removable: external.extension.type === "local" };
  }
  return { ownership: "absent", removable: false };
}

function actionFor(
  project: CatalogProject,
  context: ProjectViewModelContext,
  installed: InstalledState,
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
  if (installed.ownership !== "absent" && !installed.removable) {
    return {
      kind: "manage-in-sillytavern",
      label: "Manage in SillyTavern",
      reason: "Global extensions are managed by SillyTavern.",
    };
  }
  if (installed.ownership !== "absent") {
    return {
      kind: "uninstall",
      label: "Uninstall",
      reason:
        installed.ownership === "managed" ? "Managed by Companion" : "Installed outside Companion",
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
  const installed = installedState(project.id, context.inventory);
  const now = context.now ?? project.refreshedAt ?? project.catalogedAt;
  return {
    id: project.id,
    name: project.name,
    displayName: projectDisplayName(project.name),
    canonicalUrl: project.canonicalUrl,
    summary: project.summary,
    kind: project.kind,
    frontends: project.frontends.map(({ label }) => label),
    tags: project.tags.map(({ label }) => label),
    tagChips: project.tags.map(({ label, facet }) => ({ label, facet })),
    licenseLabel: project.license.label,
    licenseStatus: project.license.status,
    attributionLabel: project.attribution ? `by ${project.attribution.owner.login}` : null,
    primaryFunctionId: project.primaryFunction,
    primaryFunction: primaryFunctionLabel(project.primaryFunction),
    activity: {
      latestSourceActivityAt: project.activity.latestSourceActivityAt,
      latestSourceActivityLabel: relativeTime(project.activity.latestSourceActivityAt, now),
      latestSourceActivityFreshness: freshnessPercent(project.activity.latestSourceActivityAt, now),
      activeWeeks12: project.activity.activeWeeks12,
      weeklyActivity: project.activity.weeklyActivity,
      evidenceStatus: project.activity.evidenceStatus ?? "degraded",
      dormant: project.activity.dormant,
    },
    communityAggregate: project.community?.aggregate ?? null,
    repositorySizeLabel: formatRepositorySize(project.repositorySizeKb),
    preset: project.preset
      ? {
          versionLabel: project.preset.version ? formatVersion(project.preset.version) : null,
          publishedLabel: project.preset.publishedAt
            ? `Published ${relativeTime(project.preset.publishedAt, now)}`
            : null,
          sizeLabel: formatFileSize(project.preset.artifactSizeBytes),
          modelFamilies: project.preset.modelFamilies.map(({ label }) => label),
          completionFormats: project.preset.completionFormats.map(({ label }) => label),
        }
      : null,
    tavernKeeper: project.tavernKeeper,
    installed: installed.ownership !== "absent",
    ownership: installed.ownership,
    kitSelectable:
      project.id !== COMPANION_PROJECT_ID &&
      project.kind === "extension" &&
      project.frontends.some(({ id }) => id === "sillytavern") &&
      Boolean(project.install),
    action: actionFor(project, context, installed),
  };
}

function projectDisplayName(name: string): string {
  const withoutPrefix = name.replace(/^sillytavern[\s_-]+/i, "");
  return withoutPrefix || name;
}

function relativeTime(timestamp: string | null, now: string): string | null {
  if (!timestamp) return null;
  const days = daysSince(timestamp, now);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function daysSince(timestamp: string, now: string): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((new Date(now).getTime() - new Date(timestamp).getTime()) / dayMs));
}

function freshnessPercent(timestamp: string | null, now: string): number {
  if (!timestamp) return 0;
  return Math.max(0, Math.min(100, 100 - (daysSince(timestamp, now) / 30) * 100));
}

function formatRepositorySize(kilobytes: number | null): string | null {
  if (kilobytes === null) return null;
  return kilobytes >= 1024 ? `${(kilobytes / 1024).toFixed(1)} MB repo` : `${kilobytes} KB repo`;
}

function formatFileSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  return bytes >= 1024 ? `${Math.round(bytes / 1024)} KB file` : `${bytes} B file`;
}

function formatVersion(version: string): string {
  return /^\d+(?:\.\d+)*$/.test(version) ? `v${version}` : version;
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
