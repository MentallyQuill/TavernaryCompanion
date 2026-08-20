import { render } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

import { createCatalogClient, type CatalogSnapshot } from "../catalog/catalog-client";
import { createDiscoveryController } from "../catalog/discovery-controller";
import { createIndexedDbCatalogCache } from "../catalog/indexeddb-catalog-cache";
import type { ProjectPrimaryAction } from "../catalog/project-view-model";
import type { HostExtensionAdapter } from "../host/host-types";
import {
  pruneAbsentManagedRecords,
  reconcileHostInventory,
} from "../inventory/inventory-reconciler";
import type { InventorySnapshot } from "../inventory/inventory-types";
import { normalizeManagedExtensionMap } from "../inventory/managed-registry";
import {
  createLifecycleCoordinator,
  type LifecycleCoordinator,
  type PreparedInstallSelection,
  type PreparedInstallTargetChoice,
} from "../lifecycle/lifecycle-coordinator";
import type { ActiveOperation } from "../lifecycle/operation-lock";
import type { LifecycleReceipt } from "../lifecycle/operation-receipt";
import {
  InstallTargetPreparationError,
  NEWEST_LOOKUP_FAILED_REASON,
} from "../lifecycle/install-target-resolver";
import {
  CHECKED_VERSION_UNAVAILABLE_REASON,
  InstallTargetFallbackBroker,
  type InstallTargetFallbackRequest,
} from "../lifecycle/install-target-fallback-broker";
import { HostRevisionUnavailableError } from "../host/host-errors";
import {
  BulkRemovalPlanChangedError,
  executeBulkRemoval,
  parseBulkRemovalReceipt,
  prepareBulkRemoval,
  type BulkRemovalPlan,
  type BulkRemovalReceipt,
} from "../lifecycle/bulk-removal";
import type { RemovalImpact } from "../lifecycle/removal-impact";
import { assertNotCompanionProject, COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import { TrustPromptBroker, type PendingTrustPrompt } from "../lifecycle/trust-prompt-broker";
import type { ProfileStore } from "../state/profile-store";
import { createKitDiscoveryController } from "../kits/kit-discovery-controller";
import { createKitExecutor, type KitExecutor } from "../kits/kit-executor";
import { planKitOperation, inventoryFingerprint, type PlannableKit } from "../kits/kit-planner";
import { prepareKitInstallTargets } from "../kits/kit-install-targets";
import type { KitPlan, KitOperation } from "../kits/kit-plan";
import type { KitReceipt } from "../kits/kit-receipt";
import { KitStore } from "../kits/kit-store";
import {
  toPersonalKitInspector,
  toPublishedKitInspector,
  type KitInspectorViewModel,
  type InstalledKitViewModel,
  type KitPrimaryAction,
} from "../kits/kit-view-model";
import type { ReconciledKitStatus } from "../kits/kit-reconciler";
import { reconcileKitStatus } from "../kits/kit-reconciler";
import { fingerprintKitTopology } from "../kits/kit-validation";
import { UNSANDBOXED_CODE_DISCLOSURE } from "../trust/trust-copy";
import { exportKitFile } from "./kits/kit-export-action";
import { KitEditor } from "./kits/kit-editor";
import {
  addDraftMember,
  addDraftMembers,
  createKitDraft,
  type KitDraftState,
} from "../kits/kit-draft";
import { KitOperationTray } from "./kits/kit-operation-tray";
import { KitPreflightDialog } from "./kits/kit-preflight-dialog";
import { AssessmentWarningDialog } from "./lifecycle/assessment-warning-dialog";
import { OperationTray } from "./lifecycle/operation-tray";
import { InstallVersionAwareness } from "./lifecycle/install-version-awareness";
import {
  dispatchPreparedInstallChoice,
  InstallVersionChooser,
} from "./lifecycle/install-version-chooser";
import { RemovalDialog } from "./lifecycle/removal-dialog";
import { TrustDisclosureDialog } from "./lifecycle/trust-disclosure-dialog";
import { CompanionShell } from "./shell/companion-shell";
import { createShellController } from "./shell/shell-controller";
import {
  createExtensionUpdateCoordinator,
  type ExtensionUpdateCoordinator,
  type ExtensionUpdateSnapshot,
  type PreparedUpdateChoice,
} from "../updates/update-coordinator";
import type { PreparedUpdateSelection } from "../updates/update-types";
import { UpdateVersionChooser } from "./installed/update-version-chooser";
import { AddToKitDialog, type AddToKitTarget } from "./installed/add-to-kit-dialog";
import {
  clearInstalledSelection,
  EMPTY_INSTALLED_SELECTION,
  reconcileInstalledSelection,
  selectInstalledKit,
  toggleInstalledProject,
  type InstalledSelectionState,
} from "./installed/installed-selection";
import { BulkRemovalDialog } from "./lifecycle/bulk-removal-dialog";
import { createRuntimeId } from "../runtime-id";

interface CompanionPopupHostProps {
  store?: ProfileStore;
  host?: HostExtensionAdapter;
  runtime?: PopupRuntime | null;
}

export interface PopupRuntime {
  catalog: ReturnType<typeof createCatalogClient>;
  discovery: ReturnType<typeof createDiscoveryController>;
  lifecycle: LifecycleCoordinator;
  updates: ExtensionUpdateCoordinator;
  prompts: TrustPromptBroker;
  installFallbacks: InstallTargetFallbackBroker;
  kits: KitStore;
  kitDiscovery: ReturnType<typeof createKitDiscoveryController>;
  kitExecutor: KitExecutor;
  kitContext: { inventory: InventorySnapshot };
}

const emptyInventory = { managed: [], external: [], unknown: [], missingManaged: [] };

function projectScanStatus(snapshot: CatalogSnapshot | undefined, projectId: string) {
  if (!snapshot || !("catalog" in snapshot)) return null;
  return snapshot.catalog.projects.find(({ id }) => id === projectId)?.tavernKeeper ?? null;
}

function selectableInstalledProjectIds(runtime: PopupRuntime): string[] {
  return runtime.discovery
    .read()
    .installedSections.flatMap(({ rows }) =>
      rows.filter(({ selectionEligible }) => selectionEligible).map(({ id }) => id),
    );
}

function installedKitMemberships(
  kits: readonly InstalledKitViewModel[],
): Record<string, readonly string[]> {
  return Object.fromEntries(kits.map((kit) => [kit.id, kit.selectionProjectIds]));
}

export function CompanionPopupHost({
  store,
  host,
  runtime: suppliedRuntime,
}: CompanionPopupHostProps): preact.JSX.Element {
  const shell = useMemo(
    () =>
      createShellController({
        initialRoute: store?.read().preferences.route ?? "projects",
        persistRoute: store
          ? async (route) => {
              await store.update((draft) => {
                draft.preferences.route = route;
              });
            }
          : undefined,
      }),
    [store],
  );
  const runtime = useMemo(
    () => suppliedRuntime ?? createPopupRuntime(store, host),
    [host, store, suppliedRuntime],
  );
  const [catalogSnapshot, setCatalogSnapshot] = useState<CatalogSnapshot | undefined>(
    runtime?.catalog.read(),
  );
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [inventoryRefreshing, setInventoryRefreshing] = useState(false);
  const [togglingInternalName, setTogglingInternalName] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<ActiveOperation | null>(
    runtime?.lifecycle.lock.read() ?? null,
  );
  const [pendingPrompt, setPendingPrompt] = useState<PendingTrustPrompt | null>(
    runtime?.prompts.read() ?? null,
  );
  const [removalImpact, setRemovalImpact] = useState<RemovalImpact | null>(null);
  const [receipt, setReceipt] = useState<LifecycleReceipt | null>(
    parseReceipt(store?.read().operationReceipt),
  );
  const [bulkRemovalReceipt, setBulkRemovalReceipt] = useState<BulkRemovalReceipt | null>(
    parseBulkRemovalReceipt(store?.read().operationReceipt),
  );
  const [updateSnapshot, setUpdateSnapshot] = useState<ExtensionUpdateSnapshot>(
    runtime?.updates.read() ?? { states: {} },
  );
  const [kitReceipt, setKitReceipt] = useState<KitReceipt | null>(
    parseKitReceipt(store?.read().operationReceipt),
  );
  const [pendingKitPlan, setPendingKitPlan] = useState<Readonly<KitPlan> | null>(null);
  const [pendingBulkRemovalPlan, setPendingBulkRemovalPlan] = useState<BulkRemovalPlan | null>(
    null,
  );
  const [preparingBulkRemoval, setPreparingBulkRemoval] = useState(false);
  const bulkRemovalInProgress = useRef(false);
  const [kitDisclosurePlan, setKitDisclosurePlan] = useState<Readonly<KitPlan> | null>(null);
  const [kitDraft, setKitDraft] = useState<KitDraftState | null>(null);
  const [kitDraftOrigin, setKitDraftOrigin] = useState<"installed-selection" | null>(null);
  const [pendingAddToKitIds, setPendingAddToKitIds] = useState<string[] | null>(null);
  const [kitBuilderCollapsed, setKitBuilderCollapsed] = useState(true);
  const [kitInspectors, setKitInspectors] = useState<Record<string, KitInspectorViewModel>>({});
  const [installedKitCards, setInstalledKitCards] = useState<InstalledKitViewModel[]>([]);
  const [installedSelection, setInstalledSelection] =
    useState<InstalledSelectionState>(EMPTY_INSTALLED_SELECTION);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [preparingInstall, setPreparingInstall] = useState(false);
  const [preparingKitPlan, setPreparingKitPlan] = useState(false);
  const [pendingInstallChoice, setPendingInstallChoice] = useState<{
    projectId: string;
    projectName: string;
    anchor: HTMLButtonElement;
    choice: Extract<PreparedInstallTargetChoice, { kind: "choose" }>;
  } | null>(null);
  const [pendingInstallAwareness, setPendingInstallAwareness] = useState<{
    projectId: string;
    projectName: string;
    anchor: HTMLButtonElement;
    selection: PreparedInstallSelection;
  } | null>(null);
  const [pendingUpdateChoice, setPendingUpdateChoice] = useState<{
    projectId: string;
    projectName: string;
    anchor: HTMLButtonElement;
    choice: PreparedUpdateChoice;
  } | null>(null);
  const localInstallFallbacks = useMemo(() => new InstallTargetFallbackBroker(), []);
  const installFallbacks = runtime?.installFallbacks ?? localInstallFallbacks;
  const [pendingInstallFallback, setPendingInstallFallback] =
    useState<InstallTargetFallbackRequest | null>(installFallbacks.read());
  const fallbackAnchor = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const unsubscribe = installFallbacks.subscribe(setPendingInstallFallback);
    return () => {
      unsubscribe();
      installFallbacks.cancel();
    };
  }, [installFallbacks]);

  const syncKits = useCallback(async () => {
    if (!runtime || !store) return;
    const snapshot = runtime.catalog.read();
    if (!("catalog" in snapshot)) return;
    const presentation = await buildKitPresentation(
      snapshot.catalog,
      runtime.kits,
      runtime.kitContext.inventory,
    );
    runtime.kitDiscovery.setData({
      catalog: snapshot.catalog,
      personal: runtime.kits.readDefinitions(),
      statuses: presentation.statuses,
    });
    setKitInspectors(presentation.inspectors);
    setInstalledKitCards(presentation.installedKits);
    setInstalledSelection((current) =>
      reconcileInstalledSelection(
        current,
        selectableInstalledProjectIds(runtime),
        installedKitMemberships(presentation.installedKits),
      ),
    );
  }, [runtime, store]);

  const refreshInventory = useCallback(async (): Promise<boolean> => {
    if (!runtime || !host || !store) return false;
    setOperationError(null);
    setInventoryRefreshing(true);
    try {
      const observedManaged = normalizeManagedExtensionMap(store.read().managedExtensions);
      const extensions = await host.discover();
      await pruneAbsentManagedRecords({ observedManaged, hostExtensions: extensions, store });
      const snapshot = runtime.catalog.read();
      const inventory = await reconcileHostInventory({
        projects: "catalog" in snapshot ? snapshot.catalog.projects : [],
        host,
        hostExtensions: extensions,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions),
      });
      runtime.kitContext.inventory = inventory;
      runtime.discovery.setInventory(inventory);
      runtime.updates.invalidate();
      await syncKits();
      return true;
    } catch {
      setOperationError("Could not refresh installed extensions. Try again.");
      return false;
    } finally {
      setInventoryRefreshing(false);
    }
  }, [host, runtime, store, syncKits]);

  const refreshCatalog = useCallback(async () => {
    if (!runtime) return;
    setCatalogRefreshing(true);
    try {
      await runtime.catalog.refresh({ force: true });
    } finally {
      setCatalogRefreshing(false);
    }
  }, [runtime]);

  useEffect(() => {
    if (!runtime) return;
    const unsubscribeCatalog = runtime.catalog.subscribe((snapshot) => {
      setCatalogSnapshot(snapshot);
      runtime.discovery.setSnapshot(snapshot);
      if ("catalog" in snapshot) void refreshInventory();
    });
    const unsubscribeLock = runtime.lifecycle.lock.subscribe(setActiveOperation);
    const unsubscribeUpdates = runtime.updates.subscribe(setUpdateSnapshot);
    const unsubscribePrompts = runtime.prompts.subscribe(setPendingPrompt);
    const unsubscribeStore = store?.subscribe((state) => {
      if (!bulkRemovalInProgress.current) {
        setReceipt(parseReceipt(state.operationReceipt));
        setBulkRemovalReceipt(parseBulkRemovalReceipt(state.operationReceipt));
      }
      setKitReceipt(parseKitReceipt(state.operationReceipt));
      void syncKits();
    });
    const onFocus = () => void runtime.catalog.onFocus();
    window.addEventListener("focus", onFocus);
    setCatalogRefreshing(true);
    void runtime.catalog.open().finally(async () => {
      setCatalogRefreshing(false);
      if (runtime.kitExecutor.journal.read() && runtime.lifecycle.lock.read() === null) {
        await refreshInventory();
        setKitReceipt(await runtime.kitExecutor.recoverInterrupted());
        await syncKits();
      }
    });
    return () => {
      unsubscribeCatalog();
      unsubscribeLock();
      unsubscribeUpdates();
      unsubscribePrompts();
      unsubscribeStore?.();
      runtime.prompts.cancel();
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshInventory, runtime, store, syncKits]);

  const refreshInstalled = useCallback(async () => {
    if (!runtime) return;
    if (!(await refreshInventory())) return;
    await runtime.updates.checkAll();
  }, [refreshInventory, runtime]);

  const checkAllUpdates = useCallback(async () => {
    if (!runtime) return;
    setOperationError(null);
    await runtime.updates.checkAll();
  }, [runtime]);

  const requestBulkRemoval = async (projectIds: readonly string[]) => {
    if (!runtime || projectIds.length === 0) return;
    setOperationError(null);
    setPreparingBulkRemoval(true);
    try {
      setPendingBulkRemovalPlan(await prepareBulkRemoval(runtime.lifecycle, projectIds));
    } catch {
      setOperationError("Could not review the selected extensions for uninstall.");
    } finally {
      setPreparingBulkRemoval(false);
    }
  };

  const runBulkRemoval = async (plan: BulkRemovalPlan) => {
    if (!runtime || !store) return;
    setPendingBulkRemovalPlan(null);
    setPreparingBulkRemoval(true);
    setOperationError(null);
    setReceipt(null);
    setBulkRemovalReceipt(null);
    bulkRemovalInProgress.current = true;
    try {
      const result = await executeBulkRemoval(runtime.lifecycle, plan, createRuntimeId);
      bulkRemovalInProgress.current = false;
      await store.update((draft) => {
        draft.operationReceipt = structuredClone(result);
      });
      setBulkRemovalReceipt(result);
      await refreshInventory();
      const selectable = new Set(selectableInstalledProjectIds(runtime));
      const retryableProjectIds = result.retryableProjectIds.filter((id) => selectable.has(id));
      setInstalledSelection(
        retryableProjectIds.length
          ? { active: true, projectIds: retryableProjectIds, sourceKitIds: [] }
          : clearInstalledSelection(),
      );
    } catch (error) {
      bulkRemovalInProgress.current = false;
      if (error instanceof BulkRemovalPlanChangedError) {
        await refreshInventory();
        setOperationError("Installed state changed. Review the bulk uninstall again.");
      } else {
        setOperationError("The bulk uninstall could not finish.");
      }
    } finally {
      bulkRemovalInProgress.current = false;
      setPreparingBulkRemoval(false);
    }
  };

  const executeInstallSelection = async (
    projectId: string,
    projectName: string,
    anchor: HTMLButtonElement,
    selection: PreparedInstallSelection,
    allowUnavailableFallback = true,
  ): Promise<void> => {
    if (!runtime) return;
    try {
      const result = await runtime.lifecycle.install(projectId, selection);
      setReceipt(result);
      await refreshInventory();
    } catch (error) {
      if (
        allowUnavailableFallback &&
        error instanceof HostRevisionUnavailableError &&
        selection.target.kind === "checked"
      ) {
        const newest = await runtime.lifecycle.prepareNewestInstall(projectId);
        fallbackAnchor.current = anchor;
        const replacement = await installFallbacks.request({
          projectId,
          projectName,
          checked: selection as InstallTargetFallbackRequest["checked"],
          newest,
        });
        if (replacement) {
          await executeInstallSelection(projectId, projectName, anchor, replacement, false);
        }
        fallbackAnchor.current = null;
        return;
      }
      if (error instanceof HostRevisionUnavailableError && selection.target.kind === "newest") {
        throw new InstallTargetPreparationError(NEWEST_LOOKUP_FAILED_REASON, { cause: error });
      }
      throw error;
    }
  };

  const runAction = async (
    projectId: string,
    action: ProjectPrimaryAction,
    anchor: HTMLButtonElement,
  ) => {
    if (!runtime || !host) return;
    setOperationError(null);
    try {
      if (action.kind === "install") {
        setPreparingInstall(true);
        const prepared = await runtime.lifecycle.prepareInstall(projectId);
        const snapshot = runtime.catalog.read();
        const projectName =
          ("catalog" in snapshot
            ? snapshot.catalog.projects.find(({ id }) => id === projectId)?.name
            : null) ?? projectId;
        dispatchPreparedInstallChoice(
          prepared,
          (selection) => {
            void executeInstallSelection(projectId, projectName, anchor, selection).catch(
              showOperationError,
            );
          },
          (choice) => setPendingInstallChoice({ projectId, projectName, anchor, choice }),
          (selection) => setPendingInstallAwareness({ projectId, projectName, anchor, selection }),
        );
      } else if (action.kind === "uninstall") {
        setRemovalImpact(await runtime.lifecycle.previewRemoval(projectId));
      } else if (action.kind === "update-required" || action.kind === "manage-in-sillytavern") {
        await host.openExtensionManager();
      }
    } catch (error) {
      showOperationError(error);
    } finally {
      setPreparingInstall(false);
    }
  };

  const showOperationError = (error: unknown) => {
    setOperationError(error instanceof Error ? error.message : "The operation could not finish.");
  };

  const requestUpdate = (projectId: string, projectName: string, anchor: HTMLButtonElement) => {
    if (!runtime) return;
    setOperationError(null);
    try {
      setPendingUpdateChoice({
        projectId,
        projectName,
        anchor,
        choice: runtime.updates.prepare(projectId),
      });
    } catch (error) {
      showOperationError(error);
    }
  };

  const executeUpdateSelection = async (selection: PreparedUpdateSelection): Promise<void> => {
    if (!runtime) return;
    try {
      const result = await runtime.updates.update(selection);
      setReceipt(result);
    } catch (error) {
      showOperationError(error);
    }
  };

  const toggleExtension = async (projectId: string, internalName: string, enabled: boolean) => {
    if (!host) return;
    setOperationError(null);
    setTogglingInternalName(internalName);
    try {
      assertNotCompanionProject(projectId, enabled ? "enable" : "disable");
      if (enabled) await host.enable(internalName);
      else await host.disable(internalName);
      await refreshInventory();
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "The extension state could not be changed.",
      );
    } finally {
      setTogglingInternalName(null);
    }
  };

  const requestKitOperation = async (kitId: string, operation: KitOperation) => {
    if (!runtime || !store || !host) return;
    setOperationError(null);
    setPreparingKitPlan(true);
    try {
      const snapshot = runtime.catalog.read();
      if (!("catalog" in snapshot)) return;
      const kit = resolveKit(runtime, snapshot.catalog, kitId);
      if (!kit) return;
      const planned = planKitOperation({
        operation,
        kit,
        catalog: snapshot.catalog,
        inventory: runtime.kitContext.inventory,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions),
        installedKits: runtime.kits.readInstalledStates(),
        activeKitId: runtime.kits.readActiveId(),
        catalogCanMutate: snapshot.canMutate,
      });
      const plan = await prepareKitInstallTargets({
        plan: planned,
        catalog: snapshot.catalog,
        host,
      });
      if (!store.read().trustAcknowledgedAt && plan.install.length) setKitDisclosurePlan(plan);
      else setPendingKitPlan(plan);
    } catch (error) {
      showOperationError(error);
    } finally {
      setPreparingKitPlan(false);
    }
  };

  const requestKitAction = (kitId: string, action: KitPrimaryAction | "uninstall") => {
    if (action !== "uninstall" && (action.kind === "review" || action.kind === "view")) return;
    void requestKitOperation(
      kitId,
      action === "uninstall"
        ? "uninstall"
        : action.kind === "activate"
          ? "activate"
          : action.kind === "deactivate"
            ? "deactivate"
            : "install",
    );
  };

  const executeKitPlan = async (
    plan: Readonly<KitPlan>,
    approval: Parameters<KitExecutor["execute"]>[1],
  ) => {
    if (!runtime) return;
    setPendingKitPlan(null);
    setOperationError(null);
    try {
      const result = await runtime.kitExecutor.execute(plan, approval);
      setKitReceipt(result);
      await refreshInventory();
      await syncKits();
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "The Kit operation could not finish.",
      );
    }
  };

  const saveKitDraft = async (draft: KitDraftState) => {
    if (!runtime) return;
    if (draft.sourceId) {
      await runtime.kits.update(draft.sourceId, {
        title: draft.title,
        description: draft.description,
        projectIds: draft.projectIds,
      });
    } else {
      await runtime.kits.create({
        title: draft.title,
        description: draft.description,
        projectIds: draft.projectIds,
      });
    }
    setKitDraft(null);
    if (kitDraftOrigin === "installed-selection") {
      setInstalledSelection(clearInstalledSelection());
    }
    setKitDraftOrigin(null);
    setKitBuilderCollapsed(true);
    await syncKits();
  };
  const chooseAddToKitTarget = (target: AddToKitTarget) => {
    if (!runtime || !pendingAddToKitIds?.length) return;
    const source = target.kind === "existing" ? runtime.kits.readDefinition(target.kitId) : null;
    if (target.kind === "existing" && !source) {
      setOperationError("That personal Kit is no longer available.");
      setPendingAddToKitIds(null);
      return;
    }
    setKitDraft(addDraftMembers(createKitDraft(source ?? undefined), pendingAddToKitIds));
    setKitDraftOrigin("installed-selection");
    setKitBuilderCollapsed(false);
    setPendingAddToKitIds(null);
  };
  const runtimeCatalog = runtime?.catalog.read();
  const kitEditorProjects =
    runtimeCatalog && "catalog" in runtimeCatalog ? runtimeCatalog.catalog.projects : null;

  return (
    <>
      <CompanionShell
        controller={shell}
        discovery={runtime?.discovery}
        catalogSnapshot={catalogSnapshot}
        catalogRefreshing={catalogRefreshing}
        inventoryRefreshing={inventoryRefreshing}
        togglingInternalName={togglingInternalName}
        onRefreshCatalog={refreshCatalog}
        onRefreshInventory={refreshInstalled}
        updateStates={updateSnapshot.states}
        onCheckUpdates={checkAllUpdates}
        onRetryUpdate={(projectId) => void runtime?.updates.check(projectId)}
        onUpdateExtension={(projectId, anchor) => {
          const snapshot = runtime?.catalog.read();
          const projectName =
            snapshot && "catalog" in snapshot
              ? (snapshot.catalog.projects.find(({ id }) => id === projectId)?.name ?? projectId)
              : projectId;
          requestUpdate(projectId, projectName, anchor);
        }}
        onToggleExtension={(projectId, internalName, enabled) =>
          void toggleExtension(projectId, internalName, enabled)
        }
        installedSelection={installedSelection}
        onSelectInstalledKit={(kitId) => {
          const kit = installedKitCards.find(({ id }) => id === kitId);
          if (!kit) return;
          setInstalledSelection((current) =>
            selectInstalledKit(current, kit.id, kit.selectionProjectIds),
          );
        }}
        onToggleInstalledSelection={(projectId) => {
          if (!runtime) return;
          setInstalledSelection((current) => {
            const next = toggleInstalledProject(current, projectId);
            if (next.projectIds.length === 0) return { ...next, sourceKitIds: [] };
            return reconcileInstalledSelection(
              next,
              selectableInstalledProjectIds(runtime),
              installedKitMemberships(installedKitCards),
            );
          });
        }}
        onClearInstalledSelection={() => setInstalledSelection(clearInstalledSelection())}
        onAddInstalledSelectionToKit={() => {
          if (installedSelection.projectIds.length) {
            setPendingAddToKitIds([...installedSelection.projectIds]);
          }
        }}
        onUninstallInstalledSelection={() => void requestBulkRemoval(installedSelection.projectIds)}
        onProjectAction={(projectId, action, anchor) => void runAction(projectId, action, anchor)}
        onOpenExtensionManager={() => void host?.openExtensionManager()}
        onUpdateCompanion={() => void host?.openExtensionManager()}
        onOpenTavernary={() => host?.openExternal("https://tavernary.org/")}
        lifecycleDisabled={
          activeOperation !== null ||
          togglingInternalName !== null ||
          preparingInstall ||
          pendingInstallChoice !== null ||
          pendingInstallAwareness !== null ||
          pendingUpdateChoice !== null ||
          pendingInstallFallback !== null ||
          preparingKitPlan ||
          preparingBulkRemoval
        }
        kitDiscovery={runtime?.kitDiscovery}
        kitInspectors={kitInspectors}
        installedKits={installedKitCards}
        onKitAction={requestKitAction}
        onCreateKitFromSelection={(projectIds) => {
          setKitDraftOrigin(null);
          setKitDraft((current) =>
            projectIds.reduce(
              (next, projectId) => addDraftMember(next, projectId),
              current ?? createKitDraft(),
            ),
          );
          if (!kitDraft) setKitBuilderCollapsed(true);
        }}
        onEditKit={(id) => {
          const kit = runtime?.kits.readDefinition(id);
          if (kit) {
            setKitDraftOrigin(null);
            setKitDraft(createKitDraft(kit));
            setKitBuilderCollapsed(false);
          }
        }}
        onCopyKit={(id) => {
          const snapshot = runtime?.catalog.read();
          const kit =
            snapshot && "catalog" in snapshot
              ? snapshot.catalog.kits.find((item) => item.id === id)
              : null;
          if (kit) void runtime?.kits.copyPublished(kit).then(() => syncKits());
        }}
        onExportKit={(id) => {
          const kit = runtime?.kits.readDefinition(id);
          if (kit) exportKitFile(kit);
        }}
        onUninstallKit={(id) => requestKitAction(id, "uninstall")}
        onDuplicateKit={(id) =>
          void runtime?.kits
            .duplicate(id)
            .then(() => syncKits())
            .catch(() => setOperationError("The personal Kit could not be duplicated."))
        }
        onRemoveKit={(id) =>
          void runtime?.kits
            .removeDefinition(id)
            .then(() => syncKits())
            .catch(() => setOperationError("Uninstall the Kit before removing it."))
        }
        activeKitId={runtime?.kits.readActiveId() ?? null}
        kitBuilder={
          kitEditorProjects ? (
            <KitEditor
              draft={kitDraft}
              projects={kitEditorProjects}
              collapsed={kitBuilderCollapsed}
              onStart={() => {
                setKitDraftOrigin(null);
                setKitDraft((current) => current ?? createKitDraft());
                setKitBuilderCollapsed(false);
              }}
              onUpdate={setKitDraft}
              onCollapse={() => setKitBuilderCollapsed(true)}
              onDiscard={() => {
                setKitDraft(null);
                setKitDraftOrigin(null);
                setKitBuilderCollapsed(true);
              }}
              onSave={(draft) => void saveKitDraft(draft)}
            />
          ) : null
        }
      />
      {pendingAddToKitIds && runtime ? (
        <AddToKitDialog
          selectedCount={pendingAddToKitIds.length}
          kits={runtime.kits.readDefinitions()}
          onChoose={chooseAddToKitTarget}
          onCancel={() => setPendingAddToKitIds(null)}
        />
      ) : null}
      {pendingBulkRemovalPlan ? (
        <BulkRemovalDialog
          plan={pendingBulkRemovalPlan}
          onCancel={() => setPendingBulkRemovalPlan(null)}
          onConfirm={() => void runBulkRemoval(pendingBulkRemovalPlan)}
        />
      ) : null}
      {kitDisclosurePlan ? (
        <TrustDisclosureDialog
          prompt={{ kind: "unsandboxed-disclosure", copy: UNSANDBOXED_CODE_DISCLOSURE }}
          onCancel={() => setKitDisclosurePlan(null)}
          onConfirm={() => {
            const plan = kitDisclosurePlan;
            setKitDisclosurePlan(null);
            void store?.update((draft) => {
              draft.trustAcknowledgedAt = new Date().toISOString();
            });
            setPendingKitPlan(plan);
          }}
        />
      ) : null}
      {pendingKitPlan ? (
        <KitPreflightDialog
          plan={pendingKitPlan}
          onCancel={() => setPendingKitPlan(null)}
          onReview={(url) => host?.openExternal(url)}
          onConfirm={(approval) => void executeKitPlan(pendingKitPlan, approval)}
        />
      ) : null}
      {pendingPrompt?.prompt.kind === "unsandboxed-disclosure" ? (
        <TrustDisclosureDialog
          prompt={pendingPrompt.prompt}
          onCancel={() => runtime?.prompts.respond(false)}
          onConfirm={() => runtime?.prompts.respond(true)}
        />
      ) : null}
      {pendingPrompt?.prompt.kind === "assessment-warning" ? (
        <AssessmentWarningDialog
          projectName={pendingPrompt.project.name}
          prompt={pendingPrompt.prompt}
          onReview={(url) => host?.openExternal(url)}
          onCancel={() => runtime?.prompts.respond(false)}
          onConfirm={() => runtime?.prompts.respond(true)}
        />
      ) : null}
      {pendingInstallChoice ? (
        <InstallVersionChooser
          projectId={pendingInstallChoice.projectId}
          projectName={pendingInstallChoice.projectName}
          anchor={pendingInstallChoice.anchor}
          choice={pendingInstallChoice.choice}
          scanStatus={projectScanStatus(catalogSnapshot, pendingInstallChoice.projectId)}
          onCancel={() => setPendingInstallChoice(null)}
          onSelect={(selection) => {
            const pending = pendingInstallChoice;
            setPendingInstallChoice(null);
            void executeInstallSelection(
              pending.projectId,
              pending.projectName,
              pending.anchor,
              selection,
            ).catch(showOperationError);
          }}
        />
      ) : null}
      {pendingInstallAwareness ? (
        <InstallVersionAwareness
          projectId={pendingInstallAwareness.projectId}
          projectName={pendingInstallAwareness.projectName}
          anchor={pendingInstallAwareness.anchor}
          selection={pendingInstallAwareness.selection}
          onCancel={() => setPendingInstallAwareness(null)}
          onConfirm={(selection) => {
            const pending = pendingInstallAwareness;
            setPendingInstallAwareness(null);
            void executeInstallSelection(
              pending.projectId,
              pending.projectName,
              pending.anchor,
              selection,
            ).catch(showOperationError);
          }}
        />
      ) : null}
      {pendingUpdateChoice ? (
        <UpdateVersionChooser
          projectId={pendingUpdateChoice.projectId}
          projectName={pendingUpdateChoice.projectName}
          anchor={pendingUpdateChoice.anchor}
          choice={pendingUpdateChoice.choice}
          scanStatus={projectScanStatus(catalogSnapshot, pendingUpdateChoice.projectId)}
          onCancel={() => setPendingUpdateChoice(null)}
          onSelect={(selection) => {
            setPendingUpdateChoice(null);
            void executeUpdateSelection(selection);
          }}
        />
      ) : null}
      {pendingInstallFallback &&
      (fallbackAnchor.current ?? document.querySelector(".tavernary-companion-root")) ? (
        <InstallVersionChooser
          projectId={pendingInstallFallback.projectId}
          projectName={pendingInstallFallback.projectName}
          anchor={
            fallbackAnchor.current ??
            document.querySelector<HTMLElement>(".tavernary-companion-root")!
          }
          choice={{
            kind: "choose",
            checked: {
              selection: pendingInstallFallback.checked,
              disabledReason: CHECKED_VERSION_UNAVAILABLE_REASON,
            },
            newest: { selection: pendingInstallFallback.newest },
          }}
          scanStatus={projectScanStatus(catalogSnapshot, pendingInstallFallback.projectId)}
          onCancel={() => installFallbacks.cancel()}
          onSelect={(selection) => installFallbacks.respond(selection)}
        />
      ) : null}
      {removalImpact ? (
        <RemovalDialog
          impact={removalImpact}
          onCancel={() => setRemovalImpact(null)}
          onConfirm={() => {
            const projectId = removalImpact.projectId;
            setRemovalImpact(null);
            void runtime?.lifecycle.remove(projectId).then(async (result) => {
              setReceipt(result);
              await refreshInventory();
            });
          }}
        />
      ) : null}
      <OperationTray
        active={activeOperation?.operationId.startsWith("kit:") ? null : activeOperation}
        receipt={receipt}
        bulkRemovalReceipt={bulkRemovalReceipt}
        error={operationError}
        onDismissReceipt={() => {
          if (receipt) void clearStoredReceipt(store, receipt.id);
          setReceipt(null);
        }}
        onDismissError={() => setOperationError(null)}
        onRetryError={() => void refreshInventory()}
        onReload={() => host?.reload()}
        onRetryBulkRemoval={(projectIds) => {
          setInstalledSelection({ active: true, projectIds, sourceKitIds: [] });
          void requestBulkRemoval(projectIds);
        }}
        onDismissBulkRemoval={() => {
          if (bulkRemovalReceipt) void clearStoredReceipt(store, bulkRemovalReceipt.id);
          setBulkRemovalReceipt(null);
        }}
      />
      <KitOperationTray
        active={activeOperation}
        receipt={kitReceipt}
        onReload={() => host?.reload()}
        onDismiss={() => {
          if (kitReceipt) void clearStoredReceipt(store, kitReceipt.id);
          setKitReceipt(null);
        }}
        onRetry={() => {
          if (!kitReceipt) return;
          void requestKitOperation(kitReceipt.kitId, retryKitOperation(kitReceipt));
        }}
      />
    </>
  );
}

export function createPopupRuntime(
  store: ProfileStore | undefined,
  host: HostExtensionAdapter | undefined,
): PopupRuntime | null {
  if (!store || !host || !globalThis.indexedDB) return null;
  const catalog = createCatalogClient({ cache: createIndexedDbCatalogCache() });
  const discovery = createDiscoveryController({
    snapshot: catalog.read(),
    inventory: emptyInventory,
  });
  const kits = new KitStore(store);
  const kitContext = { inventory: emptyInventory as InventorySnapshot };
  const kitDiscovery = createKitDiscoveryController({
    catalog: {
      schemaVersion: 7,
      generatedAt: new Date(0).toISOString(),
      tagVocabulary: [],
      projects: [],
      kits: [],
    },
    personal: kits.readDefinitions(),
    statuses: new Map(),
  });
  const prompts = new TrustPromptBroker();
  const installFallbacks = new InstallTargetFallbackBroker();
  const lifecycle = createLifecycleCoordinator({
    host,
    store,
    getSnapshot: () => catalog.read(),
    confirm: (prompt, project) => prompts.request(prompt, project),
  });
  const lock = lifecycle.lock;
  const updates = createExtensionUpdateCoordinator({
    host,
    store,
    lock,
    getSnapshot: () => catalog.read(),
    getInventory: () => kitContext.inventory,
    confirm: (prompt, project) => prompts.request(prompt, project),
  });
  const kitExecutor = createKitExecutor({
    host,
    profile: store,
    kits,
    lock,
    getCatalog: () => {
      const snapshot = catalog.read();
      if (!("catalog" in snapshot)) throw new Error("A compatible catalog is required.");
      return snapshot.catalog;
    },
    getInventoryFingerprint: async () => {
      const snapshot = catalog.read();
      if (!("catalog" in snapshot)) throw new Error("A compatible catalog is required.");
      const inventory = await reconcileHostInventory({
        projects: snapshot.catalog.projects,
        host,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions),
      });
      kitContext.inventory = inventory;
      discovery.setInventory(inventory);
      return inventoryFingerprint({
        inventory,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions),
        installedKits: kits.readInstalledStates(),
        activeKitId: kits.readActiveId(),
      });
    },
    fallbacks: installFallbacks,
    confirm: (prompt, project) => prompts.request(prompt, project),
  });
  return {
    catalog,
    discovery,
    lifecycle,
    updates,
    prompts,
    installFallbacks,
    kits,
    kitDiscovery,
    kitExecutor,
    kitContext,
  };
}

function parseReceipt(value: Record<string, unknown> | null | undefined): LifecycleReceipt | null {
  if (
    !value ||
    typeof value.id !== "string" ||
    (value.kind !== "install" && value.kind !== "update" && value.kind !== "remove") ||
    typeof value.projectId !== "string" ||
    typeof value.projectName !== "string" ||
    !Array.isArray(value.steps)
  ) {
    return null;
  }
  return structuredClone(value) as LifecycleReceipt;
}

export function parseKitReceipt(
  value: Record<string, unknown> | null | undefined,
): KitReceipt | null {
  if (
    !value ||
    value.kind !== "kit-operation" ||
    value.formatVersion !== 1 ||
    typeof value.id !== "string" ||
    typeof value.planId !== "string" ||
    !isKitOperation(value.operation) ||
    typeof value.kitId !== "string" ||
    typeof value.startedAt !== "string" ||
    typeof value.completedAt !== "string" ||
    !isKitOutcome(value.outcome) ||
    !isNullableString(value.previousActiveKitId) ||
    !isNullableString(value.activeKitId) ||
    (value.reloadRequired !== undefined && typeof value.reloadRequired !== "boolean") ||
    !Array.isArray(value.projects) ||
    !value.projects.every(isKitProjectResult) ||
    !Array.isArray(value.keptForOtherKits) ||
    !value.keptForOtherKits.every((item) => typeof item === "string")
  ) {
    return null;
  }
  return {
    ...(structuredClone(value) as unknown as KitReceipt),
    reloadRequired: value.reloadRequired === true,
  };
}

function isKitOperation(value: unknown): value is KitOperation {
  return (
    value === "install" || value === "activate" || value === "deactivate" || value === "uninstall"
  );
}

function isKitOutcome(value: unknown): value is KitReceipt["outcome"] {
  return (
    value === "completed" || value === "partial" || value === "failed" || value === "interrupted"
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isKitProjectResult(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.projectId === "string" &&
    (result.action === "install" ||
      result.action === "enable" ||
      result.action === "disable" ||
      result.action === "remove" ||
      result.action === "keep" ||
      result.action === "context") &&
    (result.status === "verified" ||
      result.status === "failed" ||
      result.status === "untouched" ||
      result.status === "kept" ||
      result.status === "external" ||
      result.status === "context") &&
    typeof result.message === "string" &&
    typeof result.retryable === "boolean"
  );
}

function resolveKit(
  runtime: PopupRuntime,
  catalog: Extract<CatalogSnapshot, { catalog: unknown }>["catalog"],
  kitId: string,
): PlannableKit | null {
  const personal = runtime.kits.readDefinition(kitId);
  if (personal) return { id: personal.id, projectIds: personal.projectIds, origin: "personal" };
  const published = catalog.kits.find((kit) => kit.id === kitId);
  if (published) {
    return {
      id: published.id,
      projectIds: published.components.map(({ projectId }) => projectId),
      origin: "published",
    };
  }
  const installed = runtime.kits.readInstalled(kitId);
  if (!installed) return null;
  return {
    id: installed.kitId,
    projectIds: installed.definitionProjectIds ?? [
      ...new Set([...installed.installedProjectIds, ...installed.missingProjectIds]),
    ],
    origin: "published",
  };
}

export async function buildKitPresentation(
  catalog: Extract<CatalogSnapshot, { catalog: unknown }>["catalog"],
  kits: KitStore,
  inventory: InventorySnapshot,
): Promise<{
  statuses: Map<string, ReconciledKitStatus>;
  inspectors: Record<string, KitInspectorViewModel>;
  installedKits: InstalledKitViewModel[];
}> {
  const statuses = new Map<string, ReconciledKitStatus>();
  const activeId = kits.readActiveId();
  const inspectors: Record<string, KitInspectorViewModel> = {};
  for (const kit of kits.readDefinitions()) {
    const definitionFingerprint = await fingerprintKitTopology(kit.projectIds);
    const installed = await kits.hydrateDefinitionTopology(
      kit.id,
      kit.projectIds,
      definitionFingerprint,
    );
    const status = reconcileKitStatus({
      kitId: kit.id,
      definitionFingerprint,
      published: false,
      installed,
      inventory,
      activeKitId: activeId,
    });
    statuses.set(kit.id, status);
    inspectors[kit.id] = toPersonalKitInspector(kit, catalog.projects, status, installed);
  }
  for (const kit of catalog.kits) {
    const projectIds = kit.components.map(({ projectId }) => projectId);
    const definitionFingerprint = await fingerprintKitTopology(projectIds);
    const installed = await kits.hydrateDefinitionTopology(
      kit.id,
      projectIds,
      definitionFingerprint,
    );
    const status = reconcileKitStatus({
      kitId: kit.id,
      definitionFingerprint,
      published: true,
      installed,
      inventory,
      activeKitId: activeId,
    });
    statuses.set(kit.id, status);
    inspectors[kit.id] = toPublishedKitInspector(kit, status, installed);
  }
  const projectNames = new Map(catalog.projects.map((project) => [project.id, project.name]));
  const presentProjectIds = new Set([
    ...inventory.managed.map(({ project }) => project.id),
    ...inventory.external.map(({ project }) => project.id),
  ]);
  const selectableProjectIds = new Set(
    [...inventory.managed, ...inventory.external]
      .filter(
        ({ project, extension }) =>
          project.id !== COMPANION_PROJECT_ID && extension.type === "local",
      )
      .map(({ project }) => project.id),
  );
  const installedKits = kits.readInstalledStates().map((installed): InstalledKitViewModel => {
    const inspector = inspectors[installed.kitId];
    const currentNames = new Map(
      inspector?.components.map((component) => [component.projectId, component.name]) ?? [],
    );
    const topology = installed.definitionProjectIds ?? [
      ...new Set([...installed.installedProjectIds, ...installed.missingProjectIds]),
    ];
    const presentTopology = topology.filter((projectId) => presentProjectIds.has(projectId));
    const missingProjectIds = topology.filter((projectId) => !presentProjectIds.has(projectId));
    const active = installed.kitId === activeId;
    const reconciledStatus = inspector?.operationalStatus ?? installedStatusLabel(installed.status);
    const displayStatus = installedKitDisplayStatus({
      active,
      installedCount: presentTopology.length,
      missingCount: missingProjectIds.length,
      drifted: reconciledStatus === "Drifted",
    });
    return {
      id: installed.kitId,
      title: inspector?.title ?? installed.kitId,
      description:
        inspector?.description ?? "This installed Kit is no longer present in the current catalog.",
      originLabel: inspector?.originLabel ?? "Installed Kit",
      operationalStatus:
        installed.kitId === activeId
          ? "Active"
          : (inspector?.operationalStatus ?? installedStatusLabel(installed.status)),
      components: topology.map((projectId) => ({
        projectId,
        name: currentNames.get(projectId) ?? projectNames.get(projectId) ?? projectId,
      })),
      installedProjectIds: [...installed.installedProjectIds],
      missingProjectIds,
      selectionProjectIds: presentTopology.filter((projectId) =>
        selectableProjectIds.has(projectId),
      ),
      installedCount: presentTopology.length,
      totalProjectCount: topology.length,
      displayStatus,
      statusHelp: installedKitStatusHelp(displayStatus),
      active,
      orphaned: !inspector,
    };
  });
  return { statuses, inspectors, installedKits };
}

function installedKitDisplayStatus({
  active,
  installedCount,
  missingCount,
  drifted,
}: {
  active: boolean;
  installedCount: number;
  missingCount: number;
  drifted: boolean;
}): InstalledKitViewModel["displayStatus"] {
  if (installedCount === 0) return "Missing";
  if (drifted || (active && missingCount > 0)) return "Drifted";
  if (missingCount > 0) return "Partial";
  return active ? "Active" : "Complete";
}

function installedKitStatusHelp(status: InstalledKitViewModel["displayStatus"]): string {
  return {
    Active: "This Kit currently defines the enabled state for Companion-managed extensions.",
    Partial: "Some extensions in this Kit are not currently installed.",
    Drifted: "Installed or enabled extensions no longer match this Kit's last verified state.",
    Missing: "None of this Kit's extensions are currently installed.",
    Complete: "Every extension in this Kit is currently installed.",
  }[status];
}

function installedStatusLabel(status: "installed" | "incomplete" | "drifted"): string {
  return {
    installed: "Installed",
    incomplete: "Incomplete",
    drifted: "Drifted",
  }[status];
}

export function renderCompanionPopup(
  container: HTMLElement,
  options: CompanionPopupHostProps = {},
): () => void {
  render(<CompanionPopupHost {...options} />, container);
  return () => render(null, container);
}

export async function clearStoredReceipt(
  store: ProfileStore | undefined,
  receiptId: string,
): Promise<void> {
  if (!store || store.read().operationReceipt?.id !== receiptId) return;
  await store.update((draft) => {
    if (draft.operationReceipt?.id === receiptId) draft.operationReceipt = null;
  });
}

export function retryKitOperation(receipt: KitReceipt): KitOperation {
  return receipt.operation;
}
