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
    selection.binding.requestedSha === selection.target.requestedSha &&
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
      reason:
        "This extension was installed from a different repository than Tavernary lists. Review it in SillyTavern or reinstall the Tavernary version.",
    };
  }
  if (inspection.worktreeClean === false) {
    return {
      kind: "attention",
      reason:
        "This extension has local file changes, so Companion won’t overwrite them. Review those changes, then check again.",
    };
  }
  if (!inspection.branchMatches) {
    const expectedBranch = project.install.branch ?? "the repository’s default branch";
    return {
      kind: "attention",
      reason: `This extension is on the ${inspection.branch} branch, but Tavernary tracks ${expectedBranch}. Switch branches in SillyTavern, then check again.`,
    };
  }
  if (inspection.newestRelationship === "diverged") {
    return {
      kind: "attention",
      reason:
        "This extension and the Tavernary version each contain different commits, so Companion won’t merge them. Resolve the branch in SillyTavern, then check again.",
    };
  }
  if (inspection.newestRelationship === "ahead") {
    return {
      kind: "attention",
      reason:
        "This extension contains commits that aren’t in the Tavernary version, so Companion won’t replace them. Review it in SillyTavern, then check again.",
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
    !targets.some(
      ({ requestedSha }) =>
        inspection.newestSha !== null && requestedSha === inspection.newestSha.toLowerCase(),
    )
  ) {
    targets.push({
      kind: "newest",
      requestedSha:
        inspection.exactUpdateSupported && inspection.newestSha
          ? inspection.newestSha.toLowerCase()
          : null,
      resolvedAt: inspection.exactUpdateSupported ? new Date().toISOString() : null,
    });
  }
  const alreadyScanned =
    report && inspection.candidateRelationships[report.scannedSha.toLowerCase()] === "equal";
  return targets.length === 0
    ? inspection.exactUpdateSupported
      ? { kind: "current" }
      : { kind: "current", native: true }
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
