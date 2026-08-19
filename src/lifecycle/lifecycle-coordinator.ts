import type { CatalogSnapshot } from "../catalog/catalog-client";
import { parseInstallContract, type CatalogProject } from "../catalog/catalog-core";
import { HostRevisionUnavailableError } from "../host/host-errors";
import type { HostExtensionAdapter } from "../host/host-types";
import { reconcileInventory } from "../inventory/inventory-reconciler";
import { ManagedRegistry, normalizeManagedExtensionMap } from "../inventory/managed-registry";
import type { ProfileStore } from "../state/profile-store";
import { selectTrustPrompts } from "../trust/trust-policy";
import type { TrustPrompt } from "../trust/trust-types";
import { evaluateLifecycle } from "./lifecycle-policy";
import type { InstallTarget, ManagedInstallProvenance } from "./install-target";
import {
  InstallTargetPreparationError,
  prepareInstallTargetChoice,
  prepareNewestInstallTarget,
  type InstallTargetChoice,
} from "./install-target-resolver";
import { OperationLock } from "./operation-lock";
import { createReceipt, type LifecycleReceipt } from "./operation-receipt";
import {
  markInstalledKitsIncomplete,
  previewRemovalImpact,
  type RemovalImpact,
} from "./removal-impact";
import { COMPANION_PROJECT_ID } from "./self-protection";
import { executeVerifiedInstall, VerifiedInstallError } from "./verified-install";

export interface LifecycleCoordinator {
  readonly lock: OperationLock;
  prepareInstall(projectId: string): Promise<PreparedInstallTargetChoice>;
  prepareNewestInstall(
    projectId: string,
  ): Promise<PreparedInstallSelection<Extract<InstallTarget, { kind: "newest" }>>>;
  install(projectId: string, selection: PreparedInstallSelection): Promise<LifecycleReceipt>;
  previewRemoval(projectId: string): Promise<RemovalImpact>;
  remove(projectId: string): Promise<LifecycleReceipt>;
}

export interface InstallPreparationBinding {
  projectId: string;
  catalogGeneratedAt: string;
  install: {
    kind: "sillytavern-extension-git";
    repositoryUrl: string;
    branch: string | null;
    manifestPath: string;
    folderName: string;
  };
  report: { reportId: string; scannedSha: string } | null;
  target: { kind: InstallTarget["kind"]; requestedSha: string | null };
}

export interface PreparedInstallSelection<TTarget extends InstallTarget = InstallTarget> {
  target: TTarget;
  binding: InstallPreparationBinding;
}

export type PreparedInstallTargetChoice =
  | { kind: "single"; selection: PreparedInstallSelection }
  | {
      kind: "choose";
      checked: {
        selection: PreparedInstallSelection<Extract<InstallTarget, { kind: "checked" }>>;
        disabledReason: string | null;
      };
      newest: {
        selection: PreparedInstallSelection<Extract<InstallTarget, { kind: "newest" }>>;
      };
    };

export const INSTALL_CHOICE_STALE_REASON =
  "This install choice is out of date. Choose a version again.";

export class InstallPreparationStaleError extends Error {
  readonly reason = INSTALL_CHOICE_STALE_REASON;

  constructor() {
    super(INSTALL_CHOICE_STALE_REASON);
    this.name = "InstallPreparationStaleError";
  }
}

interface LifecycleCoordinatorOptions {
  host: HostExtensionAdapter;
  store: ProfileStore;
  getSnapshot(): CatalogSnapshot;
  confirm(prompt: TrustPrompt, project: CatalogProject): Promise<boolean>;
  now?: () => string;
  createId?: () => string;
  lock?: OperationLock;
}

class DefaultLifecycleCoordinator implements LifecycleCoordinator {
  readonly lock: OperationLock;
  readonly #host: HostExtensionAdapter;
  readonly #store: ProfileStore;
  readonly #getSnapshot: () => CatalogSnapshot;
  readonly #confirm: LifecycleCoordinatorOptions["confirm"];
  readonly #now: () => string;
  readonly #createId: () => string;

  constructor(options: LifecycleCoordinatorOptions) {
    this.#host = options.host;
    this.#store = options.store;
    this.#getSnapshot = options.getSnapshot;
    this.#confirm = options.confirm;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#createId = options.createId ?? (() => crypto.randomUUID());
    this.lock = options.lock ?? new OperationLock();
  }

  async prepareInstall(projectId: string): Promise<PreparedInstallTargetChoice> {
    const snapshot = this.#getSnapshot();
    const project = eligibleProjectForPreparation(projectId, snapshot);
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    if (!project || !catalog) {
      throw new InstallTargetPreparationError("This project is not eligible for installation.");
    }
    const choice = await prepareInstallTargetChoice({
      host: this.#host,
      snapshot,
      project,
      now: this.#now,
    });
    return bindInstallTargetChoice(choice, project, catalog.generatedAt);
  }

  async prepareNewestInstall(
    projectId: string,
  ): Promise<PreparedInstallSelection<Extract<InstallTarget, { kind: "newest" }>>> {
    const snapshot = this.#getSnapshot();
    const project = eligibleProjectForPreparation(projectId, snapshot);
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    if (!project || !catalog) {
      throw new InstallTargetPreparationError("This project is not eligible for installation.");
    }
    const target = await prepareNewestInstallTarget({
      host: this.#host,
      snapshot,
      project,
      now: this.#now,
    });
    return {
      target,
      binding: createPreparationBinding(project, target, catalog.generatedAt),
    };
  }

  install(projectId: string, selection: PreparedInstallSelection): Promise<LifecycleReceipt> {
    return this.lock.runExclusive(`install:${projectId}`, async ({ setPhase }) => {
      const selectedTarget = selection.target;
      const startedAt = this.#now();
      const id = this.#createId();
      const snapshot = this.#getSnapshot();
      const catalog = "catalog" in snapshot ? snapshot.catalog : null;
      const project = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (projectId === COMPANION_PROJECT_ID) {
        return this.#rejected({
          id,
          projectId,
          projectName: project?.name ?? projectId,
          startedAt,
        });
      }
      if (
        !project ||
        !catalog ||
        !matchesPreparationBinding(
          selection,
          eligibleProjectForPreparation(projectId, snapshot),
          catalog.generatedAt,
        )
      ) {
        throw new InstallPreparationStaleError();
      }

      setPhase("discovering");
      const before = await this.#host.discover();
      const registry = new ManagedRegistry(
        normalizeManagedExtensionMap(this.#store.read().managedExtensions),
      );
      const inventory = reconcileInventory({
        projects: catalog?.projects ?? [],
        hostExtensions: before,
        managed: registry.read(),
      });
      const decision = evaluateLifecycle({
        operation: "install",
        project,
        context: { snapshot, inventory },
      });
      if (decision.kind !== "allowed" || decision.operation !== "install" || !project || !catalog) {
        return this.#rejected({
          id,
          projectId,
          projectName: project?.name ?? projectId,
          startedAt,
        });
      }

      const state = this.#store.read();
      const prompts = selectTrustPrompts({
        trustAcknowledgedAt: state.trustAcknowledgedAt,
        target: selectedTarget,
        assessment: project.tavernKeeper
          ? {
              riskLevel: project.tavernKeeper.riskLevel,
              scannedSha: project.tavernKeeper.report?.scannedSha ?? null,
              reportUrl: project.tavernKeeper.report?.reportUrl ?? null,
            }
          : null,
      });
      let disclosureAccepted = Boolean(state.trustAcknowledgedAt);
      setPhase("awaiting-confirmation");
      for (const prompt of prompts) {
        const approved = await this.#confirm(prompt, project);
        if (!approved) {
          const receipt = createReceipt({
            id,
            kind: "install",
            projectId,
            projectName: project.name,
            startedAt,
            finishedAt: this.#now(),
            status: "cancelled",
            safeError: null,
            reloadRequired: false,
          });
          await this.#persistNonMutation(receipt, disclosureAccepted ? this.#now() : null);
          return receipt;
        }
        if (prompt.kind === "unsandboxed-disclosure") disclosureAccepted = true;
      }

      const executionBefore = await this.#host.discover();
      const executionSnapshot = this.#getSnapshot();
      const executionCatalog = "catalog" in executionSnapshot ? executionSnapshot.catalog : null;
      const executionProject =
        executionCatalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (
        !executionProject ||
        !executionCatalog ||
        !matchesPreparationBinding(
          selection,
          eligibleProjectForPreparation(projectId, executionSnapshot),
          executionCatalog.generatedAt,
        )
      ) {
        throw new InstallPreparationStaleError();
      }
      const executionRegistry = new ManagedRegistry(
        normalizeManagedExtensionMap(this.#store.read().managedExtensions),
      );
      const executionInventory = reconcileInventory({
        projects: executionCatalog?.projects ?? [],
        hostExtensions: executionBefore,
        managed: executionRegistry.read(),
      });
      const executionDecision = evaluateLifecycle({
        operation: "install",
        project: executionProject,
        context: { snapshot: executionSnapshot, inventory: executionInventory },
      });
      if (
        executionDecision.kind !== "allowed" ||
        executionDecision.operation !== "install" ||
        !executionProject ||
        !executionCatalog
      ) {
        throw new InstallPreparationStaleError();
      }

      setPhase("host-request");
      let verified: Awaited<ReturnType<typeof executeVerifiedInstall>>;
      try {
        verified = await executeVerifiedInstall({
          host: this.#host,
          project: executionProject,
          target: selectedTarget,
        });
      } catch (error) {
        if (error instanceof HostRevisionUnavailableError) {
          if (disclosureAccepted) {
            await this.#persistAcknowledgement().catch(() => undefined);
          }
          throw error;
        }
        if (error instanceof VerifiedInstallError) {
          const failedBeforeMutation = error.stage === "preflight";
          const receipt = createReceipt({
            id,
            kind: "install",
            projectId,
            projectName: executionProject.name,
            startedAt,
            finishedAt: this.#now(),
            status: failedBeforeMutation ? "failed" : "verification-failed",
            completedThrough: failedBeforeMutation ? "requested" : "host-accepted",
            failedAt: failedBeforeMutation ? "host-accepted" : "verified",
            safeError: verificationFailureCopy(error),
            reloadRequired: false,
            ...(failedBeforeMutation
              ? {}
              : {
                  installProvenance: createInstallProvenance({
                    target: selectedTarget,
                    installedSha: error.installedSha,
                    catalogGeneratedAt: executionCatalog.generatedAt,
                  }),
                }),
            cleanupOutcome: error.cleanupOutcome,
            tavernKeeperReportUrl:
              selectedTarget.kind === "checked" ? selectedTarget.reportUrl : null,
          });
          await this.#persistNonMutation(receipt, disclosureAccepted ? this.#now() : null);
          return receipt;
        }
        const receipt = createReceipt({
          id,
          kind: "install",
          projectId,
          projectName: executionProject.name,
          startedAt,
          finishedAt: this.#now(),
          status: "failed",
          completedThrough: "requested",
          failedAt: "host-accepted",
          safeError: "SillyTavern did not complete the install request.",
          reloadRequired: false,
        });
        await this.#persistNonMutation(receipt, disclosureAccepted ? this.#now() : null);
        return receipt;
      }

      setPhase("verifying");
      const provenance = createInstallProvenance({
        target: selectedTarget,
        installedSha: verified.installedSha,
        catalogGeneratedAt: executionCatalog.generatedAt,
      });
      executionRegistry.recordInstalled({
        projectId,
        expectedFolderName: executionDecision.contract.folderName,
        extension: verified.extension,
        installedAt: this.#now(),
        installedBy: "individual",
        provenance,
      });
      const receipt = createReceipt({
        id,
        kind: "install",
        projectId,
        projectName: executionProject.name,
        startedAt,
        finishedAt: this.#now(),
        status: "succeeded",
        completedThrough: "recorded",
        safeError: null,
        reloadRequired: true,
        installProvenance: provenance,
        cleanupOutcome: verified.cleanupOutcome,
        tavernKeeperReportUrl: selectedTarget.kind === "checked" ? selectedTarget.reportUrl : null,
      });
      setPhase("recording");
      try {
        await this.#store.update((draft) => {
          draft.managedExtensions = executionRegistry.read();
          if (disclosureAccepted && !draft.trustAcknowledgedAt) {
            draft.trustAcknowledgedAt = this.#now();
          }
          draft.operationReceipt = structuredClone(receipt);
        });
        return receipt;
      } catch {
        return createReceipt({
          id,
          kind: "install",
          projectId,
          projectName: executionProject.name,
          startedAt,
          finishedAt: this.#now(),
          status: "installed-unrecorded",
          completedThrough: "verified",
          failedAt: "recorded",
          safeError:
            "The extension is installed, but Companion could not record ownership. Reopen Companion to reconcile it.",
          reloadRequired: true,
          installProvenance: provenance,
          cleanupOutcome: verified.cleanupOutcome,
          tavernKeeperReportUrl:
            selectedTarget.kind === "checked" ? selectedTarget.reportUrl : null,
        });
      }
    });
  }

  async previewRemoval(projectId: string): Promise<RemovalImpact> {
    const snapshot = this.#getSnapshot();
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    const project = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
    const initialState = this.#store.read();
    const kitTitles = removalKitTitles(initialState.personalKits, catalog?.kits ?? []);
    if (projectId === COMPANION_PROJECT_ID || !project) {
      return previewRemovalImpact({
        projectId,
        projectName: project?.name ?? projectId,
        ownership: "absent",
        installedKits: initialState.installedKits,
        activeKitId: initialState.activeKitId,
        removable: false,
        kitTitles,
      });
    }
    const hostExtensions = await this.#host.discover();
    const inventory = reconcileInventory({
      projects: catalog?.projects ?? [],
      hostExtensions,
      managed: normalizeManagedExtensionMap(this.#store.read().managedExtensions),
    });
    const decision = evaluateLifecycle({
      operation: "remove",
      project,
      context: { snapshot, inventory },
    });
    const state = this.#store.read();
    const discoveredOwnership = inventory.managed.some(
      ({ project: candidate }) => candidate.id === projectId,
    )
      ? "managed"
      : inventory.external.some(({ project: candidate }) => candidate.id === projectId)
        ? "external"
        : "absent";
    return previewRemovalImpact({
      projectId,
      projectName: project.name,
      ownership:
        decision.kind === "allowed" && decision.operation === "remove"
          ? decision.ownership
          : discoveredOwnership,
      installedKits: state.installedKits,
      activeKitId: state.activeKitId,
      removable: decision.kind === "allowed" && decision.operation === "remove",
      kitTitles,
    });
  }

  remove(projectId: string): Promise<LifecycleReceipt> {
    return this.lock.runExclusive(`remove:${projectId}`, async ({ setPhase }) => {
      const startedAt = this.#now();
      const id = this.#createId();
      const snapshot = this.#getSnapshot();
      const catalog = "catalog" in snapshot ? snapshot.catalog : null;
      const project = catalog?.projects.find((candidate) => candidate.id === projectId) ?? null;
      if (projectId === COMPANION_PROJECT_ID) {
        return this.#rejectedRemoval({
          id,
          projectId,
          projectName: project?.name ?? projectId,
          startedAt,
        });
      }

      setPhase("discovering");
      const before = await this.#host.discover();
      const registry = new ManagedRegistry(
        normalizeManagedExtensionMap(this.#store.read().managedExtensions),
      );
      const inventory = reconcileInventory({
        projects: catalog?.projects ?? [],
        hostExtensions: before,
        managed: registry.read(),
      });
      const decision = evaluateLifecycle({
        operation: "remove",
        project,
        context: { snapshot, inventory },
      });
      if (decision.kind !== "allowed" || decision.operation !== "remove" || !project) {
        return this.#rejectedRemoval({
          id,
          projectId,
          projectName: project?.name ?? projectId,
          startedAt,
        });
      }

      setPhase("host-request");
      try {
        await this.#host.remove({
          internalName: decision.extension.internalName,
          type: decision.extension.type,
        });
      } catch {
        const receipt = createReceipt({
          id,
          kind: "remove",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "failed",
          completedThrough: "requested",
          failedAt: "host-accepted",
          safeError: "SillyTavern did not complete the uninstall request.",
          reloadRequired: false,
        });
        await this.#persistNonMutation(receipt, null);
        return receipt;
      }

      setPhase("verifying");
      const after = await this.#host.discover();
      const stillPresent = after.some(
        (extension) =>
          extension.internalName === decision.extension.internalName &&
          extension.type === decision.extension.type,
      );
      if (stillPresent) {
        const receipt = createReceipt({
          id,
          kind: "remove",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "verification-failed",
          completedThrough: "host-accepted",
          failedAt: "verified",
          safeError: "SillyTavern still reports the extension as installed.",
          reloadRequired: false,
        });
        await this.#persistNonMutation(receipt, null);
        return receipt;
      }

      registry.remove(projectId);
      const receipt = createReceipt({
        id,
        kind: "remove",
        projectId,
        projectName: project.name,
        startedAt,
        finishedAt: this.#now(),
        status: "succeeded",
        completedThrough: "recorded",
        safeError: null,
        reloadRequired: true,
      });
      setPhase("recording");
      try {
        await this.#store.update((draft) => {
          draft.managedExtensions = registry.read();
          draft.installedKits = markInstalledKitsIncomplete(draft.installedKits, projectId);
          draft.operationReceipt = structuredClone(receipt);
        });
        return receipt;
      } catch {
        return createReceipt({
          id,
          kind: "remove",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "removed-unrecorded",
          completedThrough: "verified",
          failedAt: "recorded",
          safeError:
            "The extension was removed, but Companion could not update its records. Reopen Companion to reconcile it.",
          reloadRequired: true,
        });
      }
    });
  }

  #rejected(input: {
    id: string;
    projectId: string;
    projectName: string;
    startedAt: string;
  }): LifecycleReceipt {
    return createReceipt({
      ...input,
      kind: "install",
      finishedAt: this.#now(),
      status: "rejected",
      safeError: "This project is not eligible for installation.",
      reloadRequired: false,
    });
  }

  #rejectedRemoval(input: {
    id: string;
    projectId: string;
    projectName: string;
    startedAt: string;
  }): LifecycleReceipt {
    return createReceipt({
      ...input,
      kind: "remove",
      finishedAt: this.#now(),
      status: "rejected",
      safeError: "This installed project is not eligible for direct removal.",
      reloadRequired: false,
    });
  }

  async #persistAcknowledgement(): Promise<void> {
    await this.#store.update((draft) => {
      if (!draft.trustAcknowledgedAt) draft.trustAcknowledgedAt = this.#now();
    });
  }

  async #persistNonMutation(receipt: LifecycleReceipt, trustAcknowledgedAt: string | null) {
    await this.#store
      .update((draft) => {
        if (trustAcknowledgedAt && !draft.trustAcknowledgedAt) {
          draft.trustAcknowledgedAt = trustAcknowledgedAt;
        }
        draft.operationReceipt = structuredClone(receipt);
      })
      .catch(() => undefined);
  }
}

function eligibleProjectForPreparation(
  projectId: string,
  snapshot: CatalogSnapshot,
): CatalogProject | null {
  const project =
    ("catalog" in snapshot ? snapshot.catalog.projects.find(({ id }) => id === projectId) : null) ??
    null;
  if (
    projectId === COMPANION_PROJECT_ID ||
    !project ||
    !snapshot.canMutate ||
    project.kind !== "extension" ||
    !project.frontends.some(({ id }) => id === "sillytavern")
  ) {
    return null;
  }
  try {
    if (!project.install) throw new Error("Install contract is missing.");
    const contract = parseInstallContract(project.install);
    return contract.folderName === project.install.folderName ? project : null;
  } catch {
    return null;
  }
}

function removalKitTitles(
  personalKits: Readonly<Record<string, unknown>>,
  publishedKits: readonly { id: string; title: string }[],
): Record<string, string> {
  const titles = Object.fromEntries(publishedKits.map(({ id, title }) => [id, title]));
  for (const [id, value] of Object.entries(personalKits)) {
    if (
      typeof value === "object" &&
      value !== null &&
      "title" in value &&
      typeof value.title === "string"
    ) {
      titles[id] = value.title;
    }
  }
  return titles;
}

function bindInstallTargetChoice(
  choice: InstallTargetChoice,
  project: CatalogProject,
  catalogGeneratedAt: string,
): PreparedInstallTargetChoice {
  const bind = <TTarget extends InstallTarget>(
    target: TTarget,
  ): PreparedInstallSelection<TTarget> => ({
    target,
    binding: createPreparationBinding(project, target, catalogGeneratedAt),
  });
  if (choice.kind === "single") return { kind: "single", selection: bind(choice.target) };
  return {
    kind: "choose",
    checked: {
      selection: bind(choice.checked.target),
      disabledReason: choice.checked.disabledReason,
    },
    newest: { selection: bind(choice.newest) },
  };
}

function createPreparationBinding(
  project: CatalogProject,
  target: InstallTarget,
  catalogGeneratedAt: string,
): InstallPreparationBinding {
  if (!project.install) throw new Error("Install contract is missing.");
  const install = parseInstallContract(project.install);
  const report = project.tavernKeeper?.report ?? null;
  return {
    projectId: project.id,
    catalogGeneratedAt,
    install: {
      kind: install.kind,
      repositoryUrl: install.repositoryUrl,
      branch: install.branch,
      manifestPath: install.manifestPath,
      folderName: install.folderName,
    },
    report: report ? { reportId: report.reportId, scannedSha: report.scannedSha } : null,
    target: { kind: target.kind, requestedSha: target.requestedSha },
  };
}

function matchesPreparationBinding(
  selection: PreparedInstallSelection,
  project: CatalogProject | null,
  catalogGeneratedAt: string,
): boolean {
  if (!project || !selection.target || !selection.binding) return false;
  const report = project.tavernKeeper?.report ?? null;
  if (
    selection.target.kind === "checked" &&
    (!report ||
      selection.target.reportId !== report.reportId ||
      selection.target.requestedSha.toLowerCase() !== report.scannedSha.toLowerCase())
  ) {
    return false;
  }
  const expected = createPreparationBinding(project, selection.target, catalogGeneratedAt);
  const actual = selection.binding;
  return (
    actual.projectId === expected.projectId &&
    actual.catalogGeneratedAt === expected.catalogGeneratedAt &&
    actual.install.kind === expected.install.kind &&
    actual.install.repositoryUrl === expected.install.repositoryUrl &&
    actual.install.branch === expected.install.branch &&
    actual.install.manifestPath === expected.install.manifestPath &&
    actual.install.folderName === expected.install.folderName &&
    actual.target.kind === expected.target.kind &&
    actual.target.requestedSha === expected.target.requestedSha &&
    sameReportIdentity(actual.report, expected.report)
  );
}

function sameReportIdentity(
  left: InstallPreparationBinding["report"],
  right: InstallPreparationBinding["report"],
): boolean {
  if (left === null || right === null) return left === right;
  return left.reportId === right.reportId && left.scannedSha === right.scannedSha;
}

function createInstallProvenance(input: {
  target: InstallTarget;
  installedSha: string | null;
  catalogGeneratedAt: string;
}): ManagedInstallProvenance {
  return {
    targetKind: input.target.kind,
    requestedSha: input.target.requestedSha,
    installedSha: input.installedSha,
    catalogGeneratedAt: input.catalogGeneratedAt,
    tavernKeeperReportId: input.target.kind === "checked" ? input.target.reportId : null,
  };
}

function verificationFailureCopy(error: VerifiedInstallError): string {
  if (error.stage === "preflight") {
    return error.subtype === "local-revision-lookup-unavailable"
      ? "SillyTavern can't verify the selected version, so Companion did not install it."
      : "Companion could not prepare this install request.";
  }
  if (error.cleanupOutcome === "succeeded") {
    return "The install didn't finish correctly, so Companion cleaned it up.";
  }
  if (error.cleanupOutcome === "failed") {
    return "The install didn't finish correctly, and cleanup needs attention in SillyTavern.";
  }
  return "SillyTavern did not report the expected installed extension.";
}

export function createLifecycleCoordinator(
  options: LifecycleCoordinatorOptions,
): LifecycleCoordinator {
  return new DefaultLifecycleCoordinator(options);
}
