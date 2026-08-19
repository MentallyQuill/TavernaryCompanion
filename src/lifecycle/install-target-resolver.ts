import type { CatalogSnapshot } from "../catalog/catalog-client";
import type { CatalogProject } from "../catalog/catalog-core";
import type { HostExtensionAdapter } from "../host/host-types";
import { isFullCommitSha, type InstallTarget } from "./install-target";

export const LEGACY_CHECKED_DISABLED_REASON = "Update SillyTavern to use the checked version.";
export const NEWEST_LOOKUP_FAILED_REASON = "We couldn't find the newest version. Try again.";

export type InstallTargetChoice =
  | { kind: "single"; target: InstallTarget }
  | {
      kind: "choose";
      checked: {
        target: Extract<InstallTarget, { kind: "checked" }>;
        disabledReason: string | null;
      };
      newest: Extract<InstallTarget, { kind: "newest" }>;
    };

export class InstallTargetPreparationError extends Error {
  readonly reason: string;

  constructor(reason: string, options: { cause?: unknown } = {}) {
    super(reason, options);
    this.name = "InstallTargetPreparationError";
    this.reason = reason;
  }
}

export interface InstallTargetResolver {
  prepare(project: CatalogProject): Promise<InstallTargetChoice>;
}

export interface InstallTargetResolverOptions {
  host: HostExtensionAdapter;
  snapshot: CatalogSnapshot;
  now?: () => string;
}

class DefaultInstallTargetResolver implements InstallTargetResolver {
  readonly #host: HostExtensionAdapter;
  readonly #snapshot: CatalogSnapshot;
  readonly #now: () => string;

  constructor(options: InstallTargetResolverOptions) {
    this.#host = options.host;
    this.#snapshot = options.snapshot;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async prepare(project: CatalogProject): Promise<InstallTargetChoice> {
    const currentProject = this.#currentProject(project.id);
    if (!currentProject?.install) {
      throw new InstallTargetPreparationError("This project is not available for installation.");
    }

    const report = checkedTarget(currentProject);
    const capabilities = await this.#host.getInstallCapabilities();
    if (!capabilities.pinnedCommitInstall || !capabilities.remoteRevisionLookup) {
      return legacyChoice(report, currentProject.tavernKeeper?.currentSha ?? null);
    }

    const newest = await this.#resolveNewest(currentProject);
    if (!report) return { kind: "single", target: newest };
    if (report.requestedSha === newest.requestedSha) return { kind: "single", target: report };
    return {
      kind: "choose",
      checked: { target: report, disabledReason: null },
      newest,
    };
  }

  #currentProject(projectId: string): CatalogProject | null {
    if (!("catalog" in this.#snapshot)) return null;
    return this.#snapshot.catalog.projects.find((candidate) => candidate.id === projectId) ?? null;
  }

  async #resolveNewest(
    project: CatalogProject,
  ): Promise<Extract<InstallTarget, { kind: "newest" }>> {
    try {
      const resolved = await this.#host.resolveRemoteRevision({
        repositoryUrl: project.install!.repositoryUrl,
        branch: project.install!.branch,
      });
      if (!isFullCommitSha(resolved.sha)) {
        throw new Error("The host returned an invalid newest revision.");
      }
      return {
        kind: "newest",
        requestedSha: resolved.sha.toLowerCase(),
        resolvedAt: this.#now(),
      };
    } catch (cause) {
      throw new InstallTargetPreparationError(NEWEST_LOOKUP_FAILED_REASON, { cause });
    }
  }
}

export function createInstallTargetResolver(
  options: InstallTargetResolverOptions,
): InstallTargetResolver {
  return new DefaultInstallTargetResolver(options);
}

export async function prepareInstallTargetChoice(
  options: InstallTargetResolverOptions & { project: CatalogProject },
): Promise<InstallTargetChoice> {
  return createInstallTargetResolver(options).prepare(options.project);
}

function checkedTarget(
  project: CatalogProject,
): Extract<InstallTarget, { kind: "checked" }> | null {
  const report = project.tavernKeeper?.report;
  if (
    !report ||
    !isFullCommitSha(report.scannedSha) ||
    typeof report.scannedAt !== "string" ||
    typeof report.reportId !== "string" ||
    typeof report.reportUrl !== "string"
  ) {
    return null;
  }
  return {
    kind: "checked",
    requestedSha: report.scannedSha.toLowerCase(),
    checkedAt: report.scannedAt,
    reportId: report.reportId,
    reportUrl: report.reportUrl,
  };
}

function legacyChoice(
  checked: Extract<InstallTarget, { kind: "checked" }> | null,
  catalogCurrentSha: string | null,
): InstallTargetChoice {
  const newest: Extract<InstallTarget, { kind: "newest" }> = {
    kind: "newest",
    requestedSha: null,
    resolvedAt: null,
  };
  const normalizedCatalogCurrentSha =
    typeof catalogCurrentSha === "string" ? catalogCurrentSha.toLowerCase() : null;
  if (
    !checked ||
    !normalizedCatalogCurrentSha ||
    !isFullCommitSha(normalizedCatalogCurrentSha) ||
    checked.requestedSha === normalizedCatalogCurrentSha
  ) {
    return { kind: "single", target: newest };
  }
  return {
    kind: "choose",
    checked: { target: checked, disabledReason: LEGACY_CHECKED_DISABLED_REASON },
    newest,
  };
}
