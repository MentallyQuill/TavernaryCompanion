import type { CatalogSnapshot } from "../catalog/catalog-client";
import type { CatalogProject } from "../catalog/catalog-core";
import type { HostExtensionAdapter } from "../host/host-types";
import { reconcileInventory } from "../inventory/inventory-reconciler";
import { ManagedRegistry, normalizeManagedExtensionMap } from "../inventory/managed-registry";
import type { ProfileStore } from "../state/profile-store";
import { selectTrustPrompts } from "../trust/trust-policy";
import type { TrustPrompt } from "../trust/trust-types";
import { evaluateLifecycle } from "./lifecycle-policy";
import { OperationLock } from "./operation-lock";
import { createReceipt, type LifecycleReceipt } from "./operation-receipt";
import {
  markInstalledKitsIncomplete,
  previewRemovalImpact,
  type RemovalImpact,
} from "./removal-impact";
import { COMPANION_PROJECT_ID } from "./self-protection";

export interface LifecycleCoordinator {
  readonly lock: OperationLock;
  install(projectId: string): Promise<LifecycleReceipt>;
  previewRemoval(projectId: string): Promise<RemovalImpact>;
  remove(projectId: string): Promise<LifecycleReceipt>;
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

  install(projectId: string): Promise<LifecycleReceipt> {
    return this.lock.runExclusive(`install:${projectId}`, async ({ setPhase }) => {
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
      if (decision.kind !== "allowed" || decision.operation !== "install" || !project) {
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
        assessment: project.tavernKeeper
          ? {
              riskLevel: project.tavernKeeper.riskLevel,
              freshness: project.tavernKeeper.freshness,
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

      setPhase("host-request");
      try {
        await this.#host.install({
          repositoryUrl: decision.contract.repositoryUrl,
          branch: decision.contract.branch,
        });
      } catch {
        const receipt = createReceipt({
          id,
          kind: "install",
          projectId,
          projectName: project.name,
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
      const after = await this.#host.discover();
      const installed = exactFolder(after, decision.contract.folderName);
      if (!installed) {
        const receipt = createReceipt({
          id,
          kind: "install",
          projectId,
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "verification-failed",
          completedThrough: "host-accepted",
          failedAt: "verified",
          safeError: "SillyTavern did not report the expected installed extension.",
          reloadRequired: false,
        });
        await this.#persistNonMutation(receipt, disclosureAccepted ? this.#now() : null);
        return receipt;
      }

      registry.recordInstalled({
        projectId,
        expectedFolderName: decision.contract.folderName,
        extension: installed,
        installedAt: this.#now(),
        installedBy: "individual",
      });
      const receipt = createReceipt({
        id,
        kind: "install",
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
          projectName: project.name,
          startedAt,
          finishedAt: this.#now(),
          status: "installed-unrecorded",
          completedThrough: "verified",
          failedAt: "recorded",
          safeError:
            "The extension is installed, but Companion could not record ownership. Reopen Companion to reconcile it.",
          reloadRequired: true,
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

function exactFolder(
  extensions: Awaited<ReturnType<HostExtensionAdapter["discover"]>>,
  folder: string,
) {
  const identity = folder.normalize("NFKC").toLocaleLowerCase("en-US");
  const matches = extensions.filter(
    (extension) => extension.folderName.normalize("NFKC").toLocaleLowerCase("en-US") === identity,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function createLifecycleCoordinator(
  options: LifecycleCoordinatorOptions,
): LifecycleCoordinator {
  return new DefaultLifecycleCoordinator(options);
}
