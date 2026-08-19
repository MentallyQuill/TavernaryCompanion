import type { CatalogSnapshot } from "../catalog/catalog-client";
import type { CatalogProject } from "../catalog/catalog-core";
import type { HostExtensionAdapter } from "../host/host-types";
import { HostOperationError } from "../host/host-errors";
import type { InventorySnapshot } from "../inventory/inventory-types";
import type { OperationLock } from "../lifecycle/operation-lock";
import { createReceipt, type LifecycleReceipt } from "../lifecycle/operation-receipt";
import type { ProfileStore } from "../state/profile-store";
import { selectTrustPrompts } from "../trust/trust-policy";
import type { TrustPrompt } from "../trust/trust-types";
import { isFullCommitSha } from "../lifecycle/install-target";
import { COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import {
  bindUpdateSelection,
  deriveUpdateAvailability,
  matchesUpdateBinding,
} from "./update-targets";
import type { PreparedUpdateSelection, UpdateTarget } from "./update-types";

export type ProjectUpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "current" }
  | { kind: "available"; notice: string | null; targets: UpdateTarget[] }
  | { kind: "attention"; reason: string }
  | { kind: "error"; reason: "Could not check for updates." };

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
  #generation = 0;

  constructor(options: ExtensionUpdateCoordinatorOptions) {
    this.#host = options.host;
    this.#getSnapshot = options.getSnapshot;
    this.#getInventory = options.getInventory;
    this.#lock = options.lock;
    this.#store = options.store;
    this.#confirm = options.confirm;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#createId = options.createId ?? (() => crypto.randomUUID());
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
      if (generation !== this.#generation) return;
      this.#checkedEvidence[projectId] = {
        installedSha: inspection.installedSha,
        internalName: entry.extension.internalName,
      };
      this.#setState(projectId, deriveUpdateAvailability({ project, inspection }));
    } catch (error) {
      if (generation !== this.#generation) return;
      delete this.#checkedEvidence[projectId];
      if (
        error instanceof HostOperationError &&
        error.operation === "inspectUpdate" &&
        error.status === 404
      ) {
        this.#setState(projectId, {
          kind: "attention",
          reason: "Update SillyTavern to check this extension safely.",
        });
        return;
      }
      this.#setState(projectId, {
        kind: "error",
        reason: "Could not check for updates.",
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
        const availability = deriveUpdateAvailability({ project, inspection });
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
          await this.#store.update((draft) => {
            if (disclosureAccepted && !draft.trustAcknowledgedAt) {
              draft.trustAcknowledgedAt = this.#now();
            }
            draft.operationReceipt = structuredClone(receipt);
          });
          return receipt;
        }

        setPhase("verifying");
        const discovered = await this.#host.discover();
        const verifiedExtension = discovered.find(
          (candidate) =>
            candidate.internalName === entry.extension.internalName &&
            candidate.folderName.toLocaleLowerCase("en-US") ===
              entry.extension.folderName.toLocaleLowerCase("en-US") &&
            candidate.type === entry.extension.type,
        );
        const installedSha = verifiedExtension
          ? await this.#host.readLocalRevision({
              internalName: verifiedExtension.internalName,
              type: verifiedExtension.type,
            })
          : null;
        const provenance = {
          targetKind: selection.target.kind,
          requestedSha: selection.target.requestedSha,
          installedSha,
          catalogGeneratedAt: catalog.generatedAt,
          tavernKeeperReportId:
            selection.target.kind === "checked" ? selection.target.reportId : null,
        } as const;
        if (!verifiedExtension || installedSha !== selection.target.requestedSha) {
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
          await this.#store.update((draft) => {
            if (disclosureAccepted && !draft.trustAcknowledgedAt) {
              draft.trustAcknowledgedAt = this.#now();
            }
            draft.operationReceipt = structuredClone(receipt);
          });
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
        await this.#store.update((draft) => {
          const managed = draft.managedExtensions[project.id];
          if (managed && typeof managed === "object" && !Array.isArray(managed)) {
            (managed as Record<string, unknown>).provenance = structuredClone(provenance);
          }
          if (disclosureAccepted && !draft.trustAcknowledgedAt) {
            draft.trustAcknowledgedAt = this.#now();
          }
          draft.operationReceipt = structuredClone(receipt);
        });
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
}

export function createExtensionUpdateCoordinator(
  options: ExtensionUpdateCoordinatorOptions,
): ExtensionUpdateCoordinator {
  return new DefaultExtensionUpdateCoordinator(options);
}
