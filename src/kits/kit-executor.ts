import type { CatalogProject, CatalogV7 } from "../catalog/catalog-core";
import type { HostExtension, HostExtensionAdapter } from "../host/host-types";
import { ManagedRegistry, normalizeManagedExtensionMap } from "../inventory/managed-registry";
import { legacyInstallProvenance } from "../lifecycle/install-target";
import type { OperationLock } from "../lifecycle/operation-lock";
import type { ProfileStore } from "../state/profile-store";
import { applyActivationMutations } from "./kit-activation-commit";
import { KitOperationJournal, type KitOperationJournalV1 } from "./kit-operation-journal";
import type { KitPlan } from "./kit-plan";
import { catalogMutationBinding } from "./kit-planner";
import type { KitApproval, KitProjectResult, KitReceipt } from "./kit-receipt";
import type { KitStore } from "./kit-store";
import { fingerprintKitTopology } from "./kit-validation";

interface KitExecutorDependencies {
  host: HostExtensionAdapter;
  profile: ProfileStore;
  kits: KitStore;
  lock: OperationLock;
  getCatalog(): CatalogV7;
  getInventoryFingerprint(): string | Promise<string>;
  now?: () => string;
  operationId?: () => string;
}

export class KitExecutor {
  readonly #host: HostExtensionAdapter;
  readonly #profile: ProfileStore;
  readonly #kits: KitStore;
  readonly #lock: OperationLock;
  readonly #getCatalog: () => CatalogV7;
  readonly #getInventoryFingerprint: () => string | Promise<string>;
  readonly #now: () => string;
  readonly #operationId: () => string;
  readonly journal: KitOperationJournal;

  constructor(deps: KitExecutorDependencies) {
    this.#host = deps.host;
    this.#profile = deps.profile;
    this.#kits = deps.kits;
    this.#lock = deps.lock;
    this.#getCatalog = deps.getCatalog;
    this.#getInventoryFingerprint = deps.getInventoryFingerprint;
    this.#now = deps.now ?? (() => new Date().toISOString());
    this.#operationId = deps.operationId ?? (() => crypto.randomUUID());
    this.journal = new KitOperationJournal(deps.profile);
  }

  async execute(plan: Readonly<KitPlan>, approval: KitApproval): Promise<KitReceipt> {
    validateApproval(plan, approval);
    if (plan.blockingIssues.length) throw new Error("Kit plan has blocking issues.");
    return this.#lock.runExclusive(`kit:${plan.id}`, async ({ setPhase }) => {
      if ((await this.#getInventoryFingerprint()) !== plan.inventoryFingerprint)
        throw new Error("Kit plan is stale. Review it again.");
      const catalog = structuredClone(this.#getCatalog());
      if (catalogMutationBinding(catalog, plan.requiredProjectIds) !== plan.catalogBinding)
        throw new Error("Kit catalog changed. Review the plan again.");
      const startedAt = this.#now();
      const previousActiveKitId = this.#kits.readActiveId();
      const journal: KitOperationJournalV1 = {
        formatVersion: 1,
        operationId: this.#operationId(),
        planId: plan.id,
        operation: plan.operation,
        kitId: plan.kitId,
        phase: "starting",
        startedAt,
        currentProjectId: null,
        completedProjects: [],
        preOperationActiveKitId: previousActiveKitId,
        requiredProjectIds: [...plan.requiredProjectIds],
        actionableProjectIds: [...plan.actionableProjectIds],
      };
      await this.journal.write(journal);
      let receipt: KitReceipt;
      try {
        switch (plan.operation) {
          case "install":
          case "activate":
            receipt = await this.#installOrActivate(
              plan,
              journal,
              previousActiveKitId,
              setPhase,
              catalog,
            );
            break;
          case "deactivate":
            receipt = await this.#deactivate(plan, journal, previousActiveKitId, setPhase);
            break;
          case "uninstall":
            receipt = await this.#uninstall(plan, journal, previousActiveKitId, setPhase);
            break;
          default:
            throw new Error("Unsupported Kit operation.");
        }
      } catch (error) {
        receipt = this.#receipt(plan, journal, previousActiveKitId, "failed", [
          {
            projectId: journal.currentProjectId ?? plan.kitId,
            action: "context",
            status: "failed",
            message: error instanceof Error ? error.message : "Kit operation failed.",
            retryable: true,
          },
        ]);
      }
      await this.#persistReceipt(receipt);
      await this.journal.clear();
      return receipt;
    });
  }

  async recoverInterrupted(): Promise<KitReceipt | null> {
    const journal = this.journal.read();
    if (!journal) return null;
    return this.#lock.runExclusive(`kit:recovery:${journal.operationId}`, async () => {
      const current = this.journal.read();
      return current ? this.#recoverInterrupted(current) : null;
    });
  }

  async #recoverInterrupted(journal: KitOperationJournalV1): Promise<KitReceipt> {
    const extensions = await this.#host.discover();
    const catalog = this.#getCatalog();
    const present = presentProjectIds(catalog.projects, extensions);
    const actionableIds = new Set(journal.actionableProjectIds ?? journal.requiredProjectIds);
    const results = journal.requiredProjectIds.map<KitProjectResult>((projectId) => {
      if (!actionableIds.has(projectId)) {
        return {
          projectId,
          action: "context",
          status: "external",
          message: "Context-only member required no recovery action.",
          retryable: false,
        };
      }
      return {
        projectId,
        action: "context",
        status: present.has(projectId) ? "verified" : "failed",
        message: present.has(projectId)
          ? "Present after interruption."
          : "Missing after interruption.",
        retryable: !present.has(projectId),
      };
    });
    await this.#reconcileInterruptedState(journal, present);
    const receipt: KitReceipt = {
      formatVersion: 1,
      kind: "kit-operation",
      id: journal.operationId,
      planId: journal.planId,
      operation: journal.operation,
      kitId: journal.kitId,
      startedAt: journal.startedAt,
      completedAt: this.#now(),
      outcome: "interrupted",
      previousActiveKitId: journal.preOperationActiveKitId,
      activeKitId: this.#kits.readActiveId(),
      projects: [...journal.completedProjects, ...results],
      keptForOtherKits: [],
    };
    await this.#persistReceipt(receipt);
    await this.journal.clear();
    return receipt;
  }

  async #reconcileInterruptedState(
    journal: KitOperationJournalV1,
    present: ReadonlySet<string>,
  ): Promise<void> {
    const actionableIds = journal.actionableProjectIds ?? journal.requiredProjectIds;
    const installedProjectIds = actionableIds.filter((projectId) => present.has(projectId));
    const missingProjectIds = actionableIds.filter((projectId) => !present.has(projectId));
    const current = this.#kits.readInstalled(journal.kitId);
    const activeKitId = this.#kits.readActiveId();

    if (journal.operation === "uninstall" && installedProjectIds.length === 0) {
      await this.#kits.removeInstalledState(journal.kitId);
      return;
    }

    let status: "installed" | "incomplete" | "drifted" = missingProjectIds.length
      ? "incomplete"
      : "installed";
    if (
      (journal.operation === "deactivate" || journal.operation === "uninstall") &&
      activeKitId === journal.kitId
    ) {
      status = "drifted";
    }
    if (
      journal.operation === "activate" &&
      journal.phase === "activating" &&
      activeKitId !== journal.kitId &&
      missingProjectIds.length === 0
    ) {
      status = "drifted";
      if (journal.preOperationActiveKitId) await this.#markDrifted(journal.preOperationActiveKitId);
    }

    await this.#kits.recordInstalledState({
      kitId: journal.kitId,
      definitionFingerprint: await fingerprintKitTopology(journal.requiredProjectIds),
      definitionProjectIds: [...journal.requiredProjectIds],
      installedProjectIds,
      missingProjectIds,
      status,
      installedAt: current?.installedAt ?? journal.startedAt,
      lastVerifiedAt: this.#now(),
    });
  }

  async #installOrActivate(
    plan: Readonly<KitPlan>,
    journal: KitOperationJournalV1,
    previousActiveKitId: string | null,
    setPhase: (phase: string) => void,
    catalog: CatalogV7,
  ): Promise<KitReceipt> {
    const byId = new Map(catalog.projects.map((project) => [project.id, project]));
    const results: KitProjectResult[] = [];
    let changed = false;
    for (const step of plan.install) {
      journal.currentProjectId = step.projectId;
      journal.phase = "installing";
      setPhase(`installing:${step.projectId}`);
      await this.journal.write(journal);
      const project = byId.get(step.projectId);
      try {
        if (!project?.install || project.id === "mentallyquill-tavernary-companion")
          throw new Error("Install contract is unavailable.");
        await this.#host.install({
          repositoryUrl: project.install.repositoryUrl,
          branch: project.install.branch,
        });
        changed = true;
        const extensions = await this.#host.discover();
        const extension = exactFolder(extensions, project.install.folderName);
        if (!extension) throw new Error("Installed extension could not be verified.");
        await this.#recordManaged(project, extension);
        results.push(
          result(step.projectId, "install", "verified", "Installed and verified.", false),
        );
      } catch (error) {
        results.push(result(step.projectId, "install", "failed", message(error), true));
      }
      journal.completedProjects = structuredClone(results);
      await this.journal.write(journal);
    }
    const discovered = await this.#host.discover();
    const present = presentProjectIds(catalog.projects, discovered);
    const requiredActionable = plan.actionableProjectIds;
    const missing = requiredActionable.filter((id) => !present.has(id));
    await this.#recordKitState(
      plan,
      requiredActionable.filter((id) => present.has(id)),
      missing,
      missing.length ? "incomplete" : "installed",
    );
    if (plan.operation === "activate" && missing.length) {
      if (changed) this.#host.reload();
      return this.#receipt(plan, journal, previousActiveKitId, "partial", results);
    }
    if (plan.operation === "activate") {
      journal.phase = "activating";
      setPhase("activating");
      await this.journal.write(journal);
      const records = normalizeManagedExtensionMap(this.#profile.read().managedExtensions);
      const mutations = await applyActivationMutations({
        host: this.#host,
        enable: plan.enable,
        disable: plan.disable,
        resolveInternalName: (projectId, planned) =>
          planned ?? records[projectId]?.internalName ?? null,
      });
      changed ||= mutations.changed;
      for (const failure of mutations.failures)
        results.push(result(failure.projectId, failure.action, "failed", failure.error, true));
      const verified = await this.#verifyEnabled(
        plan,
        normalizeManagedExtensionMap(this.#profile.read().managedExtensions),
      );
      if (mutations.failures.length || !verified) {
        await this.#markDrifted(plan.kitId);
        if (previousActiveKitId) await this.#markDrifted(previousActiveKitId);
        if (changed) this.#host.reload();
        return this.#receipt(plan, journal, previousActiveKitId, "failed", results);
      }
      await this.#kits.setActive(plan.kitId);
    }
    for (const step of plan.externalContext)
      results.push(
        result(step.projectId, "context", "external", "External extension left unchanged.", false),
      );
    if (changed) this.#host.reload();
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      results.some(({ status }) => status === "failed") ? "partial" : "completed",
      results,
    );
  }

  async #deactivate(
    plan: Readonly<KitPlan>,
    journal: KitOperationJournalV1,
    previousActiveKitId: string | null,
    setPhase: (phase: string) => void,
  ): Promise<KitReceipt> {
    journal.phase = "deactivating";
    setPhase("deactivating");
    await this.journal.write(journal);
    const mutations = await applyActivationMutations({
      host: this.#host,
      enable: [],
      disable: plan.disable,
      resolveInternalName: (_id, planned) => planned,
    });
    let discovered: HostExtension[] | null = null;
    let discoveryError: string | null = null;
    try {
      discovered = await this.#host.discover();
    } catch (error) {
      discoveryError = message(error);
    }
    const results = plan.disable.map((step) => {
      const mutationFailure = mutations.failures.find(
        ({ projectId }) => projectId === step.projectId,
      );
      const extension = discovered?.find(({ internalName }) => internalName === step.internalName);
      const verificationFailure = !mutationFailure && (!extension || extension.enabled);
      return result(
        step.projectId,
        "disable",
        mutationFailure || verificationFailure ? "failed" : "verified",
        mutationFailure?.error ??
          (discoveryError ? `Disabled state could not be verified: ${discoveryError}` : null) ??
          (verificationFailure
            ? "Extension remained enabled after the disable request."
            : "Disabled and verified."),
        Boolean(mutationFailure || verificationFailure),
      );
    });
    const failed = results.some(({ status }) => status === "failed");
    if (failed) await this.#markDrifted(plan.kitId);
    else await this.#kits.setActive(null);
    if (mutations.changed) this.#host.reload();
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      failed ? "partial" : "completed",
      results,
    );
  }

  async #uninstall(
    plan: Readonly<KitPlan>,
    journal: KitOperationJournalV1,
    previousActiveKitId: string | null,
    setPhase: (phase: string) => void,
  ): Promise<KitReceipt> {
    const results: KitProjectResult[] = [];
    let changed = false;
    if (previousActiveKitId === plan.kitId && plan.disable.length) {
      const mutations = await applyActivationMutations({
        host: this.#host,
        enable: [],
        disable: plan.disable,
        resolveInternalName: (_id, planned) => planned,
      });
      changed ||= mutations.changed;
      if (mutations.failures.length) {
        await this.#markDrifted(plan.kitId);
        for (const failure of mutations.failures)
          results.push(result(failure.projectId, "disable", "failed", failure.error, true));
        if (changed) this.#host.reload();
        return this.#receipt(plan, journal, previousActiveKitId, "failed", results);
      }
      let disabledVerified = false;
      try {
        const discovered = await this.#host.discover();
        disabledVerified = plan.disable.every((step) => {
          const extension = discovered.find(
            ({ internalName }) => internalName === step.internalName,
          );
          return Boolean(extension && !extension.enabled);
        });
      } catch {
        disabledVerified = false;
      }
      if (!disabledVerified) {
        await this.#markDrifted(plan.kitId);
        for (const step of plan.disable) {
          results.push(
            result(
              step.projectId,
              "disable",
              "failed",
              "Disabled state could not be verified.",
              true,
            ),
          );
        }
        if (changed) this.#host.reload();
        return this.#receipt(plan, journal, previousActiveKitId, "failed", results);
      }
      await this.#kits.setActive(null);
    }
    for (const step of plan.remove) {
      journal.currentProjectId = step.projectId;
      journal.phase = "removing";
      setPhase(`removing:${step.projectId}`);
      await this.journal.write(journal);
      const records = normalizeManagedExtensionMap(this.#profile.read().managedExtensions);
      const record = records[step.projectId];
      try {
        if (!record) throw new Error("Managed identity is unavailable.");
        const extension = (await this.#host.discover()).find(
          (candidate) =>
            candidate.internalName === record.internalName &&
            candidate.folderName.toLocaleLowerCase() === record.folderName.toLocaleLowerCase(),
        );
        if (!extension) throw new Error("Managed extension is already missing.");
        await this.#host.remove({ internalName: extension.internalName, type: extension.type });
        changed = true;
        const stillPresent = (await this.#host.discover()).some(
          (candidate) =>
            candidate.internalName === extension.internalName && candidate.type === extension.type,
        );
        if (stillPresent) throw new Error("Removal could not be verified.");
        await this.#profile.update((draft) => {
          delete draft.managedExtensions[step.projectId];
        });
        results.push(result(step.projectId, "remove", "verified", "Removed and verified.", false));
      } catch (error) {
        results.push(result(step.projectId, "remove", "failed", message(error), true));
      }
      journal.completedProjects = structuredClone(results);
      await this.journal.write(journal);
    }
    for (const step of plan.keptForOtherKits)
      results.push(
        result(step.projectId, "keep", "kept", "Kept for another installed Kit.", false),
      );
    const failed = results.some(({ status }) => status === "failed");
    if (failed) await this.#markDrifted(plan.kitId);
    else await this.#kits.removeInstalledState(plan.kitId);
    if (changed) this.#host.reload();
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      failed ? "partial" : "completed",
      results,
    );
  }

  async #recordManaged(project: CatalogProject, extension: HostExtension): Promise<void> {
    if (!project.install) throw new Error("Missing install contract.");
    await this.#profile.update((draft) => {
      const registry = new ManagedRegistry(normalizeManagedExtensionMap(draft.managedExtensions));
      registry.recordInstalled({
        projectId: project.id,
        expectedFolderName: project.install!.folderName,
        extension,
        installedAt: this.#now(),
        installedBy: "kit",
        provenance: legacyInstallProvenance(),
      });
      draft.managedExtensions = registry.read();
    });
  }
  async #recordKitState(
    plan: Readonly<KitPlan>,
    installed: string[],
    missing: string[],
    status: "installed" | "incomplete" | "drifted",
  ): Promise<void> {
    await this.#kits.recordInstalledState({
      kitId: plan.kitId,
      definitionFingerprint: await fingerprintKitTopology(plan.requiredProjectIds),
      definitionProjectIds: [...plan.requiredProjectIds],
      installedProjectIds: installed,
      missingProjectIds: missing,
      status,
      installedAt: this.#now(),
      lastVerifiedAt: this.#now(),
    });
  }
  async #markDrifted(kitId: string): Promise<void> {
    const state = this.#kits.readInstalled(kitId);
    if (!state) return;
    await this.#kits.recordInstalledState({
      ...state,
      status: "drifted",
      lastVerifiedAt: this.#now(),
    });
  }
  async #verifyEnabled(
    plan: Readonly<KitPlan>,
    records: ReturnType<typeof normalizeManagedExtensionMap>,
  ): Promise<boolean> {
    try {
      const extensions = await this.#host.discover();
      return (
        plan.enable.every((step) => {
          const name = step.internalName ?? records[step.projectId]?.internalName;
          return Boolean(
            name && extensions.find((extension) => extension.internalName === name)?.enabled,
          );
        }) &&
        plan.disable.every((step) =>
          Boolean(
            extensions.find((extension) => extension.internalName === step.internalName) &&
            !extensions.find((extension) => extension.internalName === step.internalName)?.enabled,
          ),
        )
      );
    } catch {
      return false;
    }
  }
  #receipt(
    plan: Readonly<KitPlan>,
    journal: KitOperationJournalV1,
    previousActiveKitId: string | null,
    outcome: KitReceipt["outcome"],
    projects: KitProjectResult[],
  ): KitReceipt {
    return {
      formatVersion: 1,
      kind: "kit-operation",
      id: journal.operationId,
      planId: plan.id,
      operation: plan.operation,
      kitId: plan.kitId,
      startedAt: journal.startedAt,
      completedAt: this.#now(),
      outcome,
      previousActiveKitId,
      activeKitId: this.#kits.readActiveId(),
      projects,
      keptForOtherKits: plan.keptForOtherKits.map(({ projectId }) => projectId),
    };
  }
  async #persistReceipt(receipt: KitReceipt): Promise<void> {
    await this.#profile.update((draft) => {
      draft.operationReceipt = structuredClone(receipt) as unknown as Record<string, unknown>;
    });
  }
}

export function createKitExecutor(deps: KitExecutorDependencies): KitExecutor {
  return new KitExecutor(deps);
}

function validateApproval(plan: Readonly<KitPlan>, approval: KitApproval): void {
  if (
    approval.planId !== plan.id ||
    approval.inventoryFingerprint !== plan.inventoryFingerprint ||
    approval.catalogGeneratedAt !== plan.catalogGeneratedAt ||
    approval.catalogBinding !== plan.catalogBinding
  )
    throw new Error("Kit approval does not match this plan.");
  const accepted = new Set(approval.acceptedWarningProjectIds);
  if (plan.warnings.some(({ projectId }) => !accepted.has(projectId)))
    throw new Error("Every project warning must be accepted.");
}
function exactFolder(
  extensions: readonly HostExtension[],
  folderName: string,
): HostExtension | null {
  const matches = extensions.filter(
    (extension) =>
      extension.folderName.normalize("NFKC").toLocaleLowerCase("en-US") ===
      folderName.normalize("NFKC").toLocaleLowerCase("en-US"),
  );
  return matches.length === 1 ? matches[0] : null;
}
function presentProjectIds(
  projects: readonly CatalogProject[],
  extensions: readonly HostExtension[],
): Set<string> {
  return new Set(
    projects
      .filter((project) => project.install && exactFolder(extensions, project.install.folderName))
      .map(({ id }) => id),
  );
}
function result(
  projectId: string,
  action: KitProjectResult["action"],
  status: KitProjectResult["status"],
  messageText: string,
  retryable: boolean,
): KitProjectResult {
  return { projectId, action, status, message: messageText, retryable };
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : "Host operation failed.";
}
