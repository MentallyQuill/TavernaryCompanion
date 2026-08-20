import type { CatalogSnapshot } from "../catalog/catalog-client";
import type { CatalogProject } from "../catalog/catalog-core";
import type { HostExtensionAdapter } from "../host/host-types";
import type { InventorySnapshot } from "../inventory/inventory-types";
import type { OperationLock } from "../lifecycle/operation-lock";
import { createReceipt, type LifecycleReceipt } from "../lifecycle/operation-receipt";
import type { ProfileStore } from "../state/profile-store";
import { selectTrustPrompts } from "../trust/trust-policy";
import type { TrustPrompt } from "../trust/trust-types";
import { isFullCommitSha } from "../lifecycle/install-target";
import { COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import { createRuntimeId } from "../runtime-id";
import {
  bindUpdateSelection,
  deriveUpdateAvailability,
  matchesUpdateBinding,
} from "./update-targets";
import type { HostUpdateInspection, PreparedUpdateSelection, UpdateTarget } from "./update-types";

export type ProjectUpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "current"; native?: true }
  | { kind: "available"; notice: string | null; targets: UpdateTarget[] }
  | { kind: "attention"; reason: string }
  | {
      kind: "error";
      reason: "Companion couldn’t check this extension. Try again; if it still fails, open it in SillyTavern.";
    };

export interface ExtensionUpdateSnapshot {
  states: Record<string, ProjectUpdateState>;
}

export interface PreparedUpdateChoice {
  notice: string | null;
  selections: PreparedUpdateSelection[];
}

export interface ExtensionUpdateCoordinator {
  read(): ExtensionUpdateSnapshot;
  subscribe(subscriber: (snapshot: ExtensionUpdateSnapshot) => void): () => void;
  check(projectId: string): Promise<void>;
  checkAll(): Promise<void>;
  invalidate(): void;
  prepare(projectId: string): PreparedUpdateChoice;
  update(selection: PreparedUpdateSelection): Promise<LifecycleReceipt>;
}

interface ExtensionUpdateCoordinatorOptions {
  host: HostExtensionAdapter;
  store: ProfileStore;
  lock: OperationLock;
  getSnapshot(): CatalogSnapshot;
  getInventory(): InventorySnapshot;
  confirm(prompt: TrustPrompt, project: CatalogProject): Promise<boolean>;
  now?(): string;
  createId?(): string;
}

class DefaultExtensionUpdateCoordinator implements ExtensionUpdateCoordinator {
  readonly #host: HostExtensionAdapter;
  readonly #getSnapshot: () => CatalogSnapshot;
  readonly #getInventory: () => InventorySnapshot;
  readonly #lock: OperationLock;
  readonly #store: ProfileStore;
  readonly #confirm: ExtensionUpdateCoordinatorOptions["confirm"];
  readonly #now: () => string;
  readonly #createId: () => string;
  readonly #subscribers = new Set<(snapshot: ExtensionUpdateSnapshot) => void>();
  #snapshot: ExtensionUpdateSnapshot = { states: {} };
  #checkedEvidence: Record<string, { installedSha: string; internalName: string }> = {};
  #checkSequence: Record<string, number> = {};
  #generation = 0;

  constructor(options: ExtensionUpdateCoordinatorOptions) {
    this.#host = options.host;
    this.#getSnapshot = options.getSnapshot;
    this.#getInventory = options.getInventory;
    this.#lock = options.lock;
    this.#store = options.store;
    this.#confirm = options.confirm;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#createId = options.createId ?? createRuntimeId;
  }

  read(): ExtensionUpdateSnapshot {
    return structuredClone(this.#snapshot);
  }

  subscribe(subscriber: (snapshot: ExtensionUpdateSnapshot) => void): () => void {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }

  async check(projectId: string): Promise<void> {
    if (projectId === COMPANION_PROJECT_ID) return;
    const generation = this.#generation;
    const sequence = (this.#checkSequence[projectId] ?? 0) + 1;
    this.#checkSequence[projectId] = sequence;
    const isCurrent = () =>
      generation === this.#generation && sequence === this.#checkSequence[projectId];
    this.#setState(projectId, { kind: "checking" });
    const snapshot = this.#getSnapshot();
    const inventory = this.#getInventory();
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    const project = catalog?.projects.find(({ id }) => id === projectId) ?? null;
    const entry = [...inventory.managed, ...inventory.external].find(
      (candidate) => candidate.project.id === projectId,
    );
    if (!project?.install || !entry || entry.extension.type !== "local") {
      this.#setState(projectId, { kind: "current" });
      return;
    }
    const scannedSha = project.tavernKeeper?.report?.scannedSha;
    const candidateShas =
      typeof scannedSha === "string" && isFullCommitSha(scannedSha)
        ? [scannedSha.toLowerCase()]
        : [];
    try {
      const inspection = await this.#host.inspectUpdate({
        internalName: entry.extension.internalName,
        type: entry.extension.type,
        repositoryUrl: project.install.repositoryUrl,
        branch: project.install.branch,
        candidateShas,
      });
      if (!isCurrent()) return;
      this.#publishInspection(project, entry.extension.internalName, inspection);
    } catch {
      if (!isCurrent()) return;
      delete this.#checkedEvidence[projectId];
      this.#setState(projectId, {
        kind: "error",
        reason:
          "Companion couldn’t check this extension. Try again; if it still fails, open it in SillyTavern.",
      });
    }
  }

  async checkAll(): Promise<void> {
    const inventory = this.#getInventory();
    const projectIds = [
      ...new Set(
        [...inventory.managed, ...inventory.external]
          .filter(({ extension }) => extension.type === "local")
          .filter(({ project }) => project.id !== COMPANION_PROJECT_ID)
          .map(({ project }) => project.id),
      ),
    ];
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < projectIds.length) {
        const projectId = projectIds[nextIndex];
        nextIndex += 1;
        await this.check(projectId);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, projectIds.length) }, async () => worker()));
  }

  invalidate(): void {
    this.#generation += 1;
    this.#snapshot = { states: {} };
    this.#checkedEvidence = {};
    this.#checkSequence = {};
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }

  prepare(projectId: string): PreparedUpdateChoice {
    const state = this.#snapshot.states[projectId];
    const evidence = this.#checkedEvidence[projectId];
    const snapshot = this.#getSnapshot();
    const catalog = "catalog" in snapshot ? snapshot.catalog : null;
    const project = catalog?.projects.find(({ id }) => id === projectId) ?? null;
    if (state?.kind !== "available" || !evidence || !catalog || !project) {
      throw new Error("Check this extension for updates again.");
    }
    return {
      notice: state.notice,
      selections: state.targets.map((target) =>
        bindUpdateSelection({
          project,
          catalogGeneratedAt: catalog.generatedAt,
          internalName: evidence.internalName,
          installedSha: evidence.installedSha,
          target,
        }),
      ),
    };
  }

  update(selection: PreparedUpdateSelection): Promise<LifecycleReceipt> {
    return this.#lock.runExclusive(
      `update:${selection.binding.projectId}`,
      async ({ setPhase }) => {
        const startedAt = this.#now();
        const receiptId = this.#createId();
        const snapshot = this.#getSnapshot();
        const inventory = this.#getInventory();
        const catalog = "catalog" in snapshot ? snapshot.catalog : null;
        const project =
          catalog?.projects.find(({ id }) => id === selection.binding.projectId) ?? null;
        const entry = [...inventory.managed, ...inventory.external].find(
          (candidate) => candidate.project.id === selection.binding.projectId,
        );
        if (!catalog || !project?.install || !entry || entry.extension.type !== "local") {
          throw new Error("This update choice is out of date. Check again.");
        }
        const scannedSha = project.tavernKeeper?.report?.scannedSha;
        const candidateShas =
          typeof scannedSha === "string" && isFullCommitSha(scannedSha)
            ? [scannedSha.toLowerCase()]
            : [];
        const inspection = await this.#host.inspectUpdate({
          internalName: entry.extension.internalName,
          type: entry.extension.type,
          repositoryUrl: project.install.repositoryUrl,
          branch: project.install.branch,
          candidateShas,
        });
        const availability = this.#publishInspection(
          project,
          entry.extension.internalName,
          inspection,
        );
        if (
          !matchesUpdateBinding(selection, {
            project,
            catalogGeneratedAt: catalog.generatedAt,
            internalName: entry.extension.internalName,
            installedSha: inspection.installedSha,
          })
        ) {
          throw new Error("This update choice is out of date. Check again.");
        }
        if (
          availability.kind !== "available" ||
          !availability.targets.some(
            (target) =>
              target.kind === selection.target.kind &&
              target.requestedSha === selection.target.requestedSha,
          )
        ) {
          throw new Error("This update choice is out of date. Check again.");
        }

        const state = this.#store.read();
        const prompts = selectTrustPrompts({
          trustAcknowledgedAt: state.trustAcknowledgedAt,
          target: selection.target,
          assessment: project.tavernKeeper
            ? {
                riskLevel: project.tavernKeeper.riskLevel,
                scannedSha: project.tavernKeeper.report?.scannedSha ?? null,
                reportUrl: project.tavernKeeper.report?.reportUrl ?? null,
              }
            : null,
        });
        let disclosureAccepted = false;
        setPhase("awaiting-confirmation");
        for (const prompt of prompts) {
          if (!(await this.#confirm(prompt, project))) {
            const receipt = createReceipt({
              id: receiptId,
              kind: "update",
              projectId: project.id,
              projectName: project.name,
              startedAt,
              finishedAt: this.#now(),
              status: "cancelled",
              safeError: null,
              reloadRequired: false,
            });
            await this.#store.update((draft) => {
              draft.operationReceipt = structuredClone(receipt);
            });
            return receipt;
          }
          if (prompt.kind === "unsandboxed-disclosure") disclosureAccepted = true;
        }

        setPhase("host-request");
        let applyResponseFailed = false;
        try {
          await this.#host.applyUpdate({
            internalName: entry.extension.internalName,
            type: entry.extension.type,
            repositoryUrl: project.install.repositoryUrl,
            branch: project.install.branch,
            expectedCurrentSha: selection.binding.installedSha,
            targetSha: selection.target.requestedSha,
          });
        } catch {
          applyResponseFailed = true;
        }
        if (applyResponseFailed) {
          let observedSha: string | null = null;
          let outcomeKnown = false;
          try {
            const afterRequest = await this.#host.inspectUpdate({
              internalName: entry.extension.internalName,
              type: entry.extension.type,
              repositoryUrl: project.install.repositoryUrl,
              branch: project.install.branch,
              candidateShas,
            });
            observedSha = afterRequest.installedSha;
            outcomeKnown = true;
            this.#publishInspection(project, entry.extension.internalName, afterRequest);
          } catch {
            // The request may have reached the host. Verification below must remain conservative.
          }
          if (outcomeKnown && observedSha === selection.binding.installedSha) {
            const receipt = createReceipt({
              id: receiptId,
              kind: "update",
              projectId: project.id,
              projectName: project.name,
              startedAt,
              finishedAt: this.#now(),
              status: "failed",
              completedThrough: "requested",
              failedAt: "host-accepted",
              safeError: "SillyTavern did not complete the extension update.",
              reloadRequired: false,
            });
            await this.#persistIncompleteReceipt(receipt, disclosureAccepted);
            return receipt;
          }
          if (!outcomeKnown || !matchesAppliedUpdate(selection, observedSha)) {
            delete this.#checkedEvidence[project.id];
            this.#setState(project.id, {
              kind: "attention",
              reason: "Companion could not verify the installed version. Manage it in SillyTavern.",
            });
            const receipt = createReceipt({
              id: receiptId,
              kind: "update",
              projectId: project.id,
              projectName: project.name,
              startedAt,
              finishedAt: this.#now(),
              status: "verification-failed",
              completedThrough: "requested",
              failedAt: "verified",
              safeError: "Companion could not determine whether SillyTavern applied the update.",
              reloadRequired: false,
            });
            await this.#persistIncompleteReceipt(receipt, disclosureAccepted);
            return receipt;
          }
        }

        setPhase("verifying");
        let installedSha: string | null = null;
        let verificationReadable = false;
        try {
          const discovered = await this.#host.discover();
          const verifiedExtension = discovered.find(
            (candidate) =>
              candidate.internalName === entry.extension.internalName &&
              candidate.folderName.toLocaleLowerCase("en-US") ===
                entry.extension.folderName.toLocaleLowerCase("en-US") &&
              candidate.type === entry.extension.type,
          );
          installedSha = verifiedExtension
            ? await this.#host.readLocalRevision({
                internalName: verifiedExtension.internalName,
                type: verifiedExtension.type,
              })
            : null;
          verificationReadable = true;
        } catch {
          // A successful host request without readable post-state is not a verified update.
        }
        const provenance = {
          targetKind: selection.target.kind,
          requestedSha: selection.target.requestedSha,
          installedSha,
          catalogGeneratedAt: catalog.generatedAt,
          tavernKeeperReportId:
            selection.target.kind === "checked" ? selection.target.reportId : null,
        } as const;
        if (!verificationReadable) {
          delete this.#checkedEvidence[project.id];
          this.#setState(project.id, {
            kind: "attention",
            reason: "Companion could not verify the installed version. Manage it in SillyTavern.",
          });
          const receipt = createReceipt({
            id: receiptId,
            kind: "update",
            projectId: project.id,
            projectName: project.name,
            startedAt,
            finishedAt: this.#now(),
            status: "verification-failed",
            completedThrough: "host-accepted",
            failedAt: "verified",
            safeError: "Companion could not verify the installed extension after updating.",
            reloadRequired: false,
            installProvenance: provenance,
            tavernKeeperReportUrl:
              selection.target.kind === "checked" ? selection.target.reportUrl : null,
          });
          await this.#persistIncompleteReceipt(receipt, disclosureAccepted);
          return receipt;
        }
        if (!matchesAppliedUpdate(selection, installedSha)) {
          delete this.#checkedEvidence[project.id];
          this.#setState(project.id, {
            kind: "attention",
            reason:
              "The installed version did not match the selected update. Manage it in SillyTavern.",
          });
          const receipt = createReceipt({
            id: receiptId,
            kind: "update",
            projectId: project.id,
            projectName: project.name,
            startedAt,
            finishedAt: this.#now(),
            status: "verification-failed",
            completedThrough: "host-accepted",
            failedAt: "verified",
            safeError: "SillyTavern did not report the selected extension version after updating.",
            reloadRequired: false,
            installProvenance: provenance,
            tavernKeeperReportUrl:
              selection.target.kind === "checked" ? selection.target.reportUrl : null,
          });
          await this.#persistIncompleteReceipt(receipt, disclosureAccepted);
          return receipt;
        }

        const receipt = createReceipt({
          id: receiptId,
          kind: "update",
          projectId: project.id,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "succeeded",
          completedThrough: "recorded",
          safeError: null,
          reloadRequired: true,
          installProvenance: provenance,
          tavernKeeperReportUrl:
            selection.target.kind === "checked" ? selection.target.reportUrl : null,
        });
        setPhase("recording");
        try {
          await this.#store.update((draft) => {
            const managed = draft.managedExtensions[project.id];
            if (managed && typeof managed === "object" && !Array.isArray(managed)) {
              (managed as Record<string, unknown>).provenance = structuredClone(provenance);
            }
            if (disclosureAccepted && !draft.trustAcknowledgedAt) {
              draft.trustAcknowledgedAt = this.#now();
            }
            draft.operationReceipt = null;
          });
        } catch {
          await this.check(project.id);
          return createReceipt({
            id: receiptId,
            kind: "update",
            projectId: project.id,
            projectName: project.name,
            startedAt,
            finishedAt: this.#now(),
            status: "updated-unrecorded",
            completedThrough: "verified",
            failedAt: "recorded",
            safeError:
              "The extension was updated and verified, but Companion could not save its update record. Reopen Companion to reconcile it.",
            reloadRequired: true,
            installProvenance: provenance,
            tavernKeeperReportUrl:
              selection.target.kind === "checked" ? selection.target.reportUrl : null,
          });
        }
        await this.check(project.id);
        return receipt;
      },
    );
  }

  #setState(projectId: string, state: ProjectUpdateState): void {
    this.#snapshot.states[projectId] = structuredClone(state);
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }

  #publishInspection(
    project: CatalogProject,
    internalName: string,
    inspection: HostUpdateInspection,
  ): ProjectUpdateState {
    const availability = deriveUpdateAvailability({ project, inspection });
    this.#checkedEvidence[project.id] = {
      installedSha: inspection.installedSha,
      internalName,
    };
    this.#setState(project.id, availability);
    return availability;
  }

  async #persistIncompleteReceipt(
    receipt: LifecycleReceipt,
    disclosureAccepted: boolean,
  ): Promise<void> {
    await this.#store
      .update((draft) => {
        if (disclosureAccepted && !draft.trustAcknowledgedAt) {
          draft.trustAcknowledgedAt = this.#now();
        }
        draft.operationReceipt = structuredClone(receipt);
      })
      .catch(() => undefined);
  }
}

export function createExtensionUpdateCoordinator(
  options: ExtensionUpdateCoordinatorOptions,
): ExtensionUpdateCoordinator {
  return new DefaultExtensionUpdateCoordinator(options);
}

function matchesAppliedUpdate(
  selection: PreparedUpdateSelection,
  installedSha: string | null,
): boolean {
  return selection.target.requestedSha === null
    ? installedSha !== null && installedSha !== selection.binding.installedSha
    : installedSha === selection.target.requestedSha;
}
