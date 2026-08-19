import type { CatalogKit, CatalogProject } from "../catalog/catalog-core";
import type { ReconciledKitStatus } from "./kit-reconciler";
import type { PersonalKitV1 } from "./kit-types";
import type { InstalledKitStateV1 } from "./kit-types";

export type KitPrimaryAction =
  | { kind: "install"; label: "Install Kit" }
  | { kind: "activate"; label: "Activate" }
  | { kind: "deactivate"; label: "Deactivate" }
  | { kind: "retry"; label: "Retry" }
  | { kind: "review"; label: "Review" }
  | { kind: "view"; label: "View Kit" };

export interface KitCardViewModel {
  id: string;
  title: string;
  description: string;
  origin: "personal" | "published";
  originLabel: "Personal Kit" | "Published Kit";
  componentCount: number;
  flaggedCount: number;
  operationalStatus: string;
  primaryAction: KitPrimaryAction;
}

export interface KitComponentViewModel {
  projectId: string;
  name: string;
  group: "managed" | "external" | "context" | "unavailable";
  available: boolean;
  assessment: string | null;
  canonicalUrl: string | null;
}

export interface KitInspectorViewModel extends KitCardViewModel {
  components: KitComponentViewModel[];
  editable: boolean;
  topologyChange?: KitTopologyChange;
}

export interface InstalledKitViewModel {
  id: string;
  title: string;
  description: string;
  originLabel: string;
  operationalStatus: string;
  components: Array<{ projectId: string; name: string }>;
  installedProjectIds: string[];
  orphaned: boolean;
}

export type KitTopologyChange =
  | {
      kind: "exact";
      previousProjectIds: string[];
      currentProjectIds: string[];
      addedProjectIds: string[];
      removedProjectIds: string[];
    }
  | { kind: "unknown"; currentProjectIds: string[] };

export function toPersonalKitCardViewModel(
  kit: PersonalKitV1,
  status: ReconciledKitStatus,
): KitCardViewModel {
  return {
    id: kit.id,
    title: kit.title,
    description: kit.description,
    origin: "personal",
    originLabel: "Personal Kit",
    componentCount: kit.projectIds.length,
    flaggedCount: 0,
    operationalStatus: statusLabel(status),
    primaryAction: actionFor(status),
  };
}

export function toPublishedKitCardViewModel(
  kit: CatalogKit,
  status: ReconciledKitStatus,
): KitCardViewModel {
  return {
    id: kit.id,
    title: kit.title,
    description: kit.description,
    origin: "published",
    originLabel: "Published Kit",
    componentCount: kit.components.length,
    flaggedCount: kit.flaggedProjectCount,
    operationalStatus: statusLabel(status),
    primaryAction: kit.components.some(({ availability }) => availability === "available")
      ? actionFor(status)
      : { kind: "view", label: "View Kit" },
  };
}

export function toPersonalKitInspector(
  kit: PersonalKitV1,
  projects: readonly CatalogProject[],
  status: ReconciledKitStatus,
  installed?: InstalledKitStateV1 | null,
): KitInspectorViewModel {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return {
    ...toPersonalKitCardViewModel(kit, status),
    editable: true,
    components: kit.projectIds.map((projectId) => component(byId.get(projectId), projectId)),
    topologyChange: topologyChange(status, installed, kit.projectIds),
  };
}

export function toPublishedKitInspector(
  kit: CatalogKit,
  status: ReconciledKitStatus,
  installed?: InstalledKitStateV1 | null,
): KitInspectorViewModel {
  return {
    ...toPublishedKitCardViewModel(kit, status),
    editable: false,
    components: kit.components.map(({ projectId, name, availability, canonicalUrl, project }) => ({
      projectId,
      name,
      group: availability === "available" ? groupFor(project) : "unavailable",
      available: availability === "available",
      assessment: project?.tavernKeeper?.riskLevel ?? null,
      canonicalUrl,
    })),
    topologyChange: topologyChange(
      status,
      installed,
      kit.components.map(({ projectId }) => projectId),
    ),
  };
}

function component(project: CatalogProject | undefined, id: string): KitComponentViewModel {
  return {
    projectId: id,
    name: project?.name ?? id,
    group: project ? groupFor(project) : "unavailable",
    available: Boolean(project),
    assessment: project?.tavernKeeper?.riskLevel ?? null,
    canonicalUrl: project?.canonicalUrl ?? null,
  };
}
function groupFor(project: CatalogProject | null | undefined): KitComponentViewModel["group"] {
  if (!project) return "unavailable";
  return project.kind === "extension" && project.install ? "managed" : "context";
}
function statusLabel(status: ReconciledKitStatus): string {
  return {
    saved: "Saved",
    installed: "Installed",
    active: "Active",
    incomplete: "Incomplete",
    drifted: "Drifted",
    changedOnTavernary: "Changed on Tavernary",
  }[status];
}
function actionFor(status: ReconciledKitStatus): KitPrimaryAction {
  if (status === "saved") return { kind: "install", label: "Install Kit" };
  if (status === "installed") return { kind: "activate", label: "Activate" };
  if (status === "active") return { kind: "deactivate", label: "Deactivate" };
  if (status === "incomplete") return { kind: "retry", label: "Retry" };
  return { kind: "review", label: "Review" };
}

function topologyChange(
  status: ReconciledKitStatus,
  installed: InstalledKitStateV1 | null | undefined,
  currentProjectIds: readonly string[],
): KitTopologyChange | undefined {
  if (status !== "changedOnTavernary" || !installed) return undefined;
  if (installed.definitionProjectIds === null) {
    return { kind: "unknown", currentProjectIds: [...currentProjectIds] };
  }
  const previousProjectIds = [...installed.definitionProjectIds];
  const previous = new Set(previousProjectIds);
  const current = new Set(currentProjectIds);
  return {
    kind: "exact",
    previousProjectIds,
    currentProjectIds: [...currentProjectIds],
    addedProjectIds: currentProjectIds.filter((projectId) => !previous.has(projectId)),
    removedProjectIds: previousProjectIds.filter((projectId) => !current.has(projectId)),
  };
}
