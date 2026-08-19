import type { CatalogProject } from "../catalog/catalog-core";
import type {
  HostUpdateInspection,
  PreparedUpdateSelection,
  UpdateAvailability,
  UpdateTarget,
} from "./update-types";

export function bindUpdateSelection({
  project,
  catalogGeneratedAt,
  internalName,
  installedSha,
  target,
}: {
  project: CatalogProject;
  catalogGeneratedAt: string;
  internalName: string;
  installedSha: string;
  target: UpdateTarget;
}): PreparedUpdateSelection {
  if (!project.install) throw new Error("This project cannot be updated.");
  return {
    target: structuredClone(target),
    binding: {
      projectId: project.id,
      catalogGeneratedAt,
      internalName,
      installedSha,
      repositoryUrl: project.install.repositoryUrl,
      branch: project.install.branch,
      requestedSha: target.requestedSha,
    },
  };
}

export function matchesUpdateBinding(
  selection: PreparedUpdateSelection,
  current: {
    project: CatalogProject;
    catalogGeneratedAt: string;
    internalName: string;
    installedSha: string;
  },
): boolean {
  return (
    selection.binding.installedSha === current.installedSha &&
    selection.binding.catalogGeneratedAt === current.catalogGeneratedAt &&
    selection.binding.projectId === current.project.id &&
    selection.binding.internalName === current.internalName &&
    current.project.install !== null &&
    sameRepositoryUrl(selection.binding.repositoryUrl, current.project.install.repositoryUrl) &&
    selection.binding.branch === current.project.install.branch
  );
}

export function deriveUpdateAvailability({
  project,
  inspection,
}: {
  project: CatalogProject;
  inspection: HostUpdateInspection;
}): UpdateAvailability {
  if (!project.install || !sameRepositoryUrl(project.install.repositoryUrl, inspection.remoteUrl)) {
    return {
      kind: "attention",
      reason: "This extension comes from a different repository. Manage it in SillyTavern.",
    };
  }
  if (!inspection.worktreeClean) {
    return {
      kind: "attention",
      reason: "This extension has local changes. Manage it in SillyTavern.",
    };
  }
  if (!inspection.branchMatches) {
    return {
      kind: "attention",
      reason: "This extension is on another branch. Manage it in SillyTavern.",
    };
  }
  if (inspection.newestRelationship === "diverged") {
    return {
      kind: "attention",
      reason: "This extension has diverged history. Manage it in SillyTavern.",
    };
  }
  if (inspection.newestRelationship === "ahead") {
    return {
      kind: "attention",
      reason: "This extension is ahead of the catalog branch. Manage it in SillyTavern.",
    };
  }
  if (
    !inspection.exactUpdateSupported &&
    (inspection.newestRelationship === "behind" ||
      Object.values(inspection.candidateRelationships).includes("behind"))
  ) {
    return {
      kind: "attention",
      reason: "Update SillyTavern to update this extension safely.",
    };
  }
  const targets: UpdateTarget[] = [];
  const report = project.tavernKeeper?.report;
  if (
    report &&
    inspection.exactUpdateSupported &&
    inspection.candidateRelationships[report.scannedSha.toLowerCase()] === "behind"
  ) {
    targets.push({
      kind: "checked",
      requestedSha: report.scannedSha.toLowerCase(),
      checkedAt: report.scannedAt,
      reportId: report.reportId,
      reportUrl: report.reportUrl,
    });
  }
  if (
    inspection.newestRelationship === "behind" &&
    !targets.some(({ requestedSha }) => requestedSha === inspection.newestSha.toLowerCase())
  ) {
    targets.push({
      kind: "newest",
      requestedSha: inspection.newestSha.toLowerCase(),
      resolvedAt: new Date().toISOString(),
    });
  }
  const alreadyScanned =
    report && inspection.candidateRelationships[report.scannedSha.toLowerCase()] === "equal";
  return targets.length === 0
    ? { kind: "current" }
    : {
        kind: "available",
        notice: alreadyScanned ? "You already have the latest scanned version." : null,
        targets,
      };
}

export function sameRepositoryUrl(left: string, right: string): boolean {
  return (
    repositoryIdentity(left) !== null && repositoryIdentity(left) === repositoryIdentity(right)
  );
}

function repositoryIdentity(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const path = url.pathname.replace(/\/+$/u, "").replace(/\.git$/iu, "");
  if (!path) return null;
  return `${url.protocol}//${url.host.toLowerCase()}${path}`;
}
