import type { CatalogProject, CatalogV7 } from "../catalog/catalog-core";
import { HostRevisionUnavailableError } from "../host/host-errors";
import type { HostExtension, HostExtensionAdapter } from "../host/host-types";
import { ManagedRegistry, normalizeManagedExtensionMap } from "../inventory/managed-registry";
import type { InstallTarget, ManagedInstallProvenance } from "../lifecycle/install-target";
import {
  CHECKED_VERSION_UNAVAILABLE_REASON,
  InstallTargetFallbackBroker,
} from "../lifecycle/install-target-fallback-broker";
import type { PreparedInstallSelection } from "../lifecycle/lifecycle-coordinator";
import { prepareNewestInstallTarget } from "../lifecycle/install-target-resolver";
import type { OperationLock } from "../lifecycle/operation-lock";
import { createRuntimeId } from "../runtime-id";
import type { ProfileStore } from "../state/profile-store";
import { selectTrustPrompts } from "../trust/trust-policy";
import type { TrustPrompt } from "../trust/trust-types";
import { executeVerifiedInstall, VerifiedInstallError } from "../lifecycle/verified-install";
import { applyActivationMutations, type ActivationMutationResult } from "./kit-activation-commit";
import {
  sameInstallTarget,
  validateInstallTargetApproval,
  type KitInstallTargetSelection,
} from "./kit-install-targets";
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
  fallbacks: InstallTargetFallbackBroker;
  confirm(prompt: TrustPrompt, project: CatalogProject): Promise<boolean>;
  now?: () => string;
  operationId?: () => string;
}

interface KitExecutionProgress {
  reloadRequired: boolean;
}

export class KitExecutor {
  readonly #host: HostExtensionAdapter;
  readonly #profile: ProfileStore;
  readonly #kits: KitStore;
  readonly #lock: OperationLock;
  readonly #getCatalog: () => CatalogV7;
  readonly #getInventoryFingerprint: () => string | Promise<string>;
  readonly #fallbacks: InstallTargetFallbackBroker;
  readonly #confirm: KitExecutorDependencies["confirm"];
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
    this.#fallbacks = deps.fallbacks;
    this.#confirm = deps.confirm;
    this.#now = deps.now ?? (() => new Date().toISOString());
    this.#operationId = deps.operationId ?? createRuntimeId;
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
      validateInstallTargetApproval(
        plan,
        approval.selectedInstallTargets,
        approval.installTargetBinding,
      );
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
        selectedInstallTargets: structuredClone(approval.selectedInstallTargets),
        completedMutations: [],
      };
      await this.journal.write(journal);
      const progress: KitExecutionProgress = { reloadRequired: false };
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
              structuredClone(approval.selectedInstallTargets),
              progress,
            );
            break;
          case "deactivate":
            receipt = await this.#deactivate(
              plan,
              journal,
              previousActiveKitId,
              setPhase,
              progress,
            );
            break;
          case "uninstall":
            receipt = await this.#uninstall(plan, journal, previousActiveKitId, setPhase, progress);
            break;
          default:
            throw new Error("Unsupported Kit operation.");
        }
      } catch (error) {
        receipt = this.#receipt(
          plan,
          journal,
          previousActiveKitId,
          "failed",
          [
            {
              projectId: journal.currentProjectId ?? plan.kitId,
              action: "context",
              status: "failed",
              message: error instanceof Error ? error.message : "Kit operation failed.",
              retryable: true,
            },
          ],
          progress.reloadRequired,
        );
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
      reloadRequired: false,
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
    selectedInstallTargets: KitInstallTargetSelection[],
    progress: KitExecutionProgress,
  ): Promise<KitReceipt> {
    const byId = new Map(catalog.projects.map((project) => [project.id, project]));
    const selected = new Map(
      selectedInstallTargets.map((selection) => [selection.projectId, selection.target]),
    );
    const results: KitProjectResult[] = [];
    let stopRemainingInstalls = false;
    for (let index = 0; index < plan.install.length; index += 1) {
      const step = plan.install[index];
      journal.currentProjectId = step.projectId;
      journal.phase = "installing";
      setPhase(`installing:${step.projectId}`);
      await this.journal.write(journal);
      const project = byId.get(step.projectId);
      let target = selected.get(step.projectId) ?? null;
      try {
        if (!project?.install || !target || project.id === "mentallyquill-tavernary-companion")
          throw new Error("Install contract is unavailable.");
        let verified: Awaited<ReturnType<typeof executeVerifiedInstall>>;
        try {
          verified = await executeVerifiedInstall({ host: this.#host, project, target });
        } catch (error) {
          if (!(error instanceof HostRevisionUnavailableError) || target.kind !== "checked") {
            throw error;
          }
          const newest = await prepareNewestInstallTarget({
            host: this.#host,
            snapshot: {
              state: "ready-current",
              canMutate: true,
              checkedAt: null,
              catalog,
            },
            project,
            now: this.#now,
          });
          const replacement = await this.#fallbacks.request({
            projectId: project.id,
            projectName: project.name,
            checked: preparedSelection(project, target, catalog.generatedAt),
            newest: preparedSelection(project, newest, catalog.generatedAt),
          });
          if (!replacement) {
            results.push(
              result(step.projectId, "install", "failed", CHECKED_VERSION_UNAVAILABLE_REASON, true),
            );
            appendUntouchedResults(results, plan.install.slice(index + 1));
            stopRemainingInstalls = true;
            break;
          }
          if (
            replacement.target.kind !== "newest" ||
            !sameInstallTarget(replacement.target, newest)
          )
            throw new Error("The replacement Kit install target changed.");
          target = replacement.target;
          selected.set(step.projectId, target);
          journal.selectedInstallTargets = [...selected.entries()].map(([projectId, value]) => ({
            projectId,
            target: structuredClone(value),
          }));
          await this.journal.write(journal);
          if (!(await this.#confirmChangedTarget(project, target))) {
            results.push(
              result(
                step.projectId,
                "install",
                "failed",
                "The newest version was not installed.",
                true,
              ),
            );
            appendUntouchedResults(results, plan.install.slice(index + 1));
            stopRemainingInstalls = true;
            break;
          }
          verified = await executeVerifiedInstall({ host: this.#host, project, target });
        }
        progress.reloadRequired = true;
        const provenance = installProvenance(target, verified.installedSha, catalog.generatedAt);
        await this.#recordManaged(project, verified.extension, provenance);
        results.push(
          result(
            step.projectId,
            "install",
            "verified",
            target.kind === "checked"
              ? "Installed the checked version."
              : "Installed the newest version.",
            false,
            provenance,
          ),
        );
      } catch (error) {
        if (error instanceof VerifiedInstallError && error.stage === "post-install-verification") {
          progress.reloadRequired = true;
        }
        results.push(
          result(step.projectId, "install", "failed", kitInstallFailureMessage(error), true),
        );
      }
      journal.completedProjects = structuredClone(results);
      await this.journal.write(journal);
    }
    if (stopRemainingInstalls) {
      journal.completedProjects = structuredClone(results);
      await this.journal.write(journal);
    }
    const discovered = await this.#host.discover();
    const present = presentProjectIds(catalog.projects, discovered);
    const requiredActionable = plan.actionableProjectIds;
    const attemptedInstalls = new Set(plan.install.map(({ projectId }) => projectId));
    const managed = normalizeManagedExtensionMap(this.#profile.read().managedExtensions);
    const installed = requiredActionable.filter(
      (id) => present.has(id) && (!attemptedInstalls.has(id) || Boolean(managed[id])),
    );
    const missing = requiredActionable.filter((id) => !installed.includes(id));
    await this.#recordKitState(
      plan,
      installed,
      missing,
      missing.length ? "incomplete" : "installed",
    );
    if (plan.operation === "activate" && missing.length) {
      return this.#receipt(
        plan,
        journal,
        previousActiveKitId,
        "partial",
        results,
        progress.reloadRequired,
      );
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
        onResult: (mutation) => this.#recordMutationProgress(journal, progress, mutation),
      });
      progress.reloadRequired ||= mutations.changed;
      for (const failure of mutations.failures)
        results.push(result(failure.projectId, failure.action, "failed", failure.error, true));
      const verified = await this.#verifyEnabled(
        plan,
        normalizeManagedExtensionMap(this.#profile.read().managedExtensions),
      );
      if (mutations.failures.length || !verified) {
        await this.#markDrifted(plan.kitId);
        if (previousActiveKitId) await this.#markDrifted(previousActiveKitId);
        return this.#receipt(
          plan,
          journal,
          previousActiveKitId,
          "failed",
          results,
          progress.reloadRequired,
        );
      }
      await this.#kits.setActive(plan.kitId);
    }
    for (const step of plan.externalContext)
      results.push(
        result(step.projectId, "context", "external", "External extension left unchanged.", false),
      );
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      results.some(({ status }) => status === "failed") ? "partial" : "completed",
      results,
      progress.reloadRequired,
    );
  }

  async #deactivate(
    plan: Readonly<KitPlan>,
    journal: KitOperationJournalV1,
    previousActiveKitId: string | null,
    setPhase: (phase: string) => void,
    progress: KitExecutionProgress,
  ): Promise<KitReceipt> {
    journal.phase = "deactivating";
    setPhase("deactivating");
    await this.journal.write(journal);
    const mutations = await applyActivationMutations({
      host: this.#host,
      enable: [],
      disable: plan.disable,
      resolveInternalName: (_id, planned) => planned,
      onResult: (mutation) => this.#recordMutationProgress(journal, progress, mutation),
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
    progress.reloadRequired ||= mutations.changed;
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      failed ? "partial" : "completed",
      results,
      progress.reloadRequired,
    );
  }

  async #uninstall(
    plan: Readonly<KitPlan>,
    journal: KitOperationJournalV1,
    previousActiveKitId: string | null,
    setPhase: (phase: string) => void,
    progress: KitExecutionProgress,
  ): Promise<KitReceipt> {
    const results: KitProjectResult[] = [];
    if (previousActiveKitId === plan.kitId && plan.disable.length) {
      const mutations = await applyActivationMutations({
        host: this.#host,
        enable: [],
        disable: plan.disable,
        resolveInternalName: (_id, planned) => planned,
        onResult: (mutation) => this.#recordMutationProgress(journal, progress, mutation),
      });
      progress.reloadRequired ||= mutations.changed;
      if (mutations.failures.length) {
        await this.#markDrifted(plan.kitId);
        for (const failure of mutations.failures)
          results.push(result(failure.projectId, "disable", "failed", failure.error, true));
        return this.#receipt(
          plan,
          journal,
          previousActiveKitId,
          "failed",
          results,
          progress.reloadRequired,
        );
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
        return this.#receipt(
          plan,
          journal,
          previousActiveKitId,
          "failed",
          results,
          progress.reloadRequired,
        );
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
        progress.reloadRequired = true;
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
    return this.#receipt(
      plan,
      journal,
      previousActiveKitId,
      failed ? "partial" : "completed",
      results,
      progress.reloadRequired,
    );
  }

  async #recordManaged(
    project: CatalogProject,
    extension: HostExtension,
    provenance: ManagedInstallProvenance,
  ): Promise<void> {
    if (!project.install) throw new Error("Missing install contract.");
    await this.#profile.update((draft) => {
      const registry = new ManagedRegistry(normalizeManagedExtensionMap(draft.managedExtensions));
      registry.recordInstalled({
        projectId: project.id,
        expectedFolderName: project.install!.folderName,
        extension,
        installedAt: this.#now(),
        installedBy: "kit",
        provenance,
      });
      draft.managedExtensions = registry.read();
    });
  }

  async #recordMutationProgress(
    journal: KitOperationJournalV1,
    progress: KitExecutionProgress,
    mutation: Readonly<ActivationMutationResult>,
  ): Promise<void> {
    progress.reloadRequired ||= mutation.changed;
    journal.currentProjectId = mutation.projectId;
    journal.completedMutations = [...(journal.completedMutations ?? []), structuredClone(mutation)];
    await this.journal.write(journal);
  }

  async #confirmChangedTarget(project: CatalogProject, target: InstallTarget): Promise<boolean> {
    const state = this.#profile.read();
    const prompts = selectTrustPrompts({
      trustAcknowledgedAt: state.trustAcknowledgedAt,
      target,
      assessment: project.tavernKeeper
        ? {
            riskLevel: project.tavernKeeper.riskLevel,
            scannedSha: project.tavernKeeper.report?.scannedSha ?? null,
            reportUrl: project.tavernKeeper.report?.reportUrl ?? null,
          }
        : null,
    });
    let disclosureAccepted = Boolean(state.trustAcknowledgedAt);
    for (const prompt of prompts) {
      if (!(await this.#confirm(prompt, project))) return false;
      if (prompt.kind === "unsandboxed-disclosure") disclosureAccepted = true;
    }
    if (disclosureAccepted && !state.trustAcknowledgedAt) {
      await this.#profile.update((draft) => {
        if (!draft.trustAcknowledgedAt) draft.trustAcknowledgedAt = this.#now();
      });
    }
    return true;
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
    reloadRequired: boolean,
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
      reloadRequired,
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
  validateInstallTargetApproval(
    plan,
    approval.selectedInstallTargets,
    approval.installTargetBinding,
  );
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
  installProvenance?: ManagedInstallProvenance,
): KitProjectResult {
  return {
    projectId,
    action,
    status,
    message: messageText,
    retryable,
    ...(installProvenance ? { installProvenance } : {}),
  };
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : "Host operation failed.";
}

function preparedSelection<TTarget extends InstallTarget>(
  project: CatalogProject,
  target: TTarget,
  catalogGeneratedAt: string,
): PreparedInstallSelection<TTarget> {
  if (!project.install) throw new Error("Install contract is unavailable.");
  const report = project.tavernKeeper?.report ?? null;
  return {
    target,
    binding: {
      projectId: project.id,
      catalogGeneratedAt,
      install: {
        kind: project.install.kind,
        repositoryUrl: project.install.repositoryUrl,
        branch: project.install.branch,
        manifestPath: project.install.manifestPath,
        folderName: project.install.folderName,
      },
      report: report ? { reportId: report.reportId, scannedSha: report.scannedSha } : null,
      target: { kind: target.kind, requestedSha: target.requestedSha },
    },
  };
}

function appendUntouchedResults(
  results: KitProjectResult[],
  steps: readonly { projectId: string }[],
): void {
  for (const step of steps) {
    results.push(
      result(
        step.projectId,
        "install",
        "untouched",
        "Not started. You can try the Kit again.",
        true,
      ),
    );
  }
}

function installProvenance(
  target: InstallTarget,
  installedSha: string | null,
  catalogGeneratedAt: string,
): ManagedInstallProvenance {
  return {
    targetKind: target.kind,
    requestedSha: target.requestedSha,
    installedSha,
    catalogGeneratedAt,
    tavernKeeperReportId: target.kind === "checked" ? target.reportId : null,
  };
}

function kitInstallFailureMessage(error: unknown): string {
  if (error instanceof HostRevisionUnavailableError) {
    return "We couldn't find the newest version. Try again.";
  }
  if (error instanceof VerifiedInstallError) {
    if (error.stage === "preflight") {
      return "SillyTavern couldn't check the selected version, so Companion did not install it.";
    }
    if (error.cleanupOutcome === "succeeded") {
      return "The install didn't finish correctly, so Companion cleaned it up.";
    }
    if (error.cleanupOutcome === "failed") {
      return "The install didn't finish correctly, and cleanup needs attention in SillyTavern.";
    }
  }
  return "The install could not finish. Try again.";
}
