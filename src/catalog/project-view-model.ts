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
  tooltips: {
    type: string;
    activity: string;
    latestSourceActivity: string | null;
    community: string | null;
    repositorySize: string | null;
    attribution: string | null;
    license: string;
    frontends: string[];
    tags: string[];
    preset: {
      version: string | null;
      published: string | null;
      size: string | null;
      modelFamilies: string[];
      completionFormats: string[];
    } | null;
  };
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
  const primaryFunction = primaryFunctionLabel(project.primaryFunction);
  const latestSourceActivityLabel = relativeTime(project.activity.latestSourceActivityAt, now);
  const repositorySizeLabel = formatRepositorySize(project.repositorySizeKb);
  const presetVersion = project.preset?.version ? formatVersion(project.preset.version) : null;
  const presetPublishedAt = project.preset?.publishedAt ?? null;
  const presetSize = formatFileSize(project.preset?.artifactSizeBytes ?? null);
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
    attributionLabel: project.attribution ? attributionByline(project.attribution) : null,
    primaryFunctionId: project.primaryFunction,
    primaryFunction,
    activity: {
      latestSourceActivityAt: project.activity.latestSourceActivityAt,
      latestSourceActivityLabel,
      latestSourceActivityFreshness: freshnessPercent(project.activity.latestSourceActivityAt, now),
      activeWeeks12: project.activity.activeWeeks12,
      weeklyActivity: project.activity.weeklyActivity,
      evidenceStatus: project.activity.evidenceStatus ?? "degraded",
      dormant: project.activity.dormant,
    },
    communityAggregate: project.community?.aggregate ?? null,
    repositorySizeLabel,
    preset: project.preset
      ? {
          versionLabel: presetVersion,
          publishedLabel: project.preset.publishedAt
            ? `Published ${relativeTime(project.preset.publishedAt, now)}`
            : null,
          sizeLabel: presetSize,
          modelFamilies: project.preset.modelFamilies.map(({ label }) => label),
          completionFormats: project.preset.completionFormats.map(({ label }) => label),
        }
      : null,
    tooltips: {
      type: typeTooltip(primaryFunction, project.kind),
      activity: activityTooltip(project),
      latestSourceActivity: latestSourceActivityTooltip(project, latestSourceActivityLabel),
      community: project.community
        ? `${project.community.aggregate} total: ${project.community.stars} stars, ${project.community.forks} forks, ${project.community.watchers} watchers`
        : null,
      repositorySize: repositorySizeLabel
        ? `${repositorySizeLabel.replace(" repo", "")} repository`
        : null,
      attribution: project.attribution ? attributionTooltip(project.attribution) : null,
      license: licenseTooltip(project),
      frontends: project.frontends.map(({ description }) => description),
      tags: project.tags.map(({ description }) => description),
      preset: project.preset
        ? {
            version: presetVersion ? `Preset version ${presetVersion}` : null,
            published: presetPublishedAt ? `Published ${formatDate(presetPublishedAt)}` : null,
            size: presetSize,
            modelFamilies: project.preset.modelFamilies.map(({ description }) => description),
            completionFormats: project.preset.completionFormats.map(
              ({ description }) => description,
            ),
          }
        : null,
    },
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

function typeTooltip(primaryFunction: string, kind: CatalogProject["kind"]): string {
  if (kind === "frontend" && primaryFunction.toLocaleLowerCase().startsWith("frontend")) {
    return "Frontend";
  }
  return `${primaryFunction} ${
    {
      frontend: "Frontend",
      extension: "Extension",
      preset: "System Preset",
    }[kind]
  }`;
}

function licenseTooltip(project: CatalogProject): string {
  if (project.license.status === "osi-approved") {
    return `${project.license.label} is OSI-approved`;
  }
  if (project.license.status === "proprietary") return "Proprietary license";
  if (project.license.status === "pending") return "License pending verification";
  return "No license detected";
}

function activityTooltip(project: CatalogProject): string {
  const activeWeeks = project.activity.activeWeeks12;
  if (activeWeeks === null || project.activity.weeklyActivity === null)
    return "Activity unavailable";
  const summary =
    project.activity.evidenceStatus === "provisional"
      ? `Approximate activity in ${activeWeeks} of the last 12 weeks; baseline pending`
      : `Source activity in ${activeWeeks} of the last 12 weeks`;
  return project.activity.evidenceStatus === "degraded"
    ? `${summary}; activity evidence is incomplete`
    : summary;
}

function latestSourceActivityTooltip(
  project: CatalogProject,
  relative: string | null,
): string | null {
  if (project.activity.latestSourceActivityAt && relative) {
    return `Last source activity ${formatDate(project.activity.latestSourceActivityAt)} (${relative})`;
  }
  if (project.activity.activeWeeks12 === null || project.activity.weeklyActivity === null) {
    return null;
  }
  if (project.activity.evidenceStatus === "complete") {
    return "No source activity in the last 12 weeks";
  }
  if (project.activity.evidenceStatus === "provisional") {
    return "Source activity baseline pending";
  }
  return "Source activity evidence incomplete";
}

function attributionByline(attribution: NonNullable<CatalogProject["attribution"]>): string {
  const count = attribution.humanContributorCount;
  if (count === 0) return `by ${attribution.owner.login}`;
  return `by ${attribution.owner.login}, plus ${count} ${count === 1 ? "contributor" : "contributors"}`;
}

function attributionTooltip(attribution: NonNullable<CatalogProject["attribution"]>): string {
  const provider = attribution.owner.provider === "github" ? "GitHub" : "Codeberg";
  const parts = [`${provider} owner: ${attribution.owner.login}`];
  const humans = attribution.contributors
    .filter(({ botOrAi }) => !botOrAi)
    .map(({ login }) => login);
  const botsOrAi = attribution.contributors
    .filter(({ botOrAi }) => botOrAi)
    .map(({ login }) => login);

  if (attribution.status === "pending") {
    parts.push("Contributor data pending");
  } else {
    if (humans.length > 0) parts.push(`Contributors: ${humans.join(", ")}`);
    if (botsOrAi.length > 0) parts.push(`Bots/AI: ${botsOrAi.join(", ")}`);
    if (attribution.status === "stale") parts.push("Contributor data stale");
    else if (attribution.status === "partial") parts.push("Contributor history still scanning");
  }
  return parts.join(" · ");
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

function formatDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(timestamp));
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
