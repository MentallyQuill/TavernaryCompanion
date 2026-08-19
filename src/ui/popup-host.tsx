import { render } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

import { createCatalogClient, type CatalogSnapshot } from "../catalog/catalog-client";
import { createDiscoveryController } from "../catalog/discovery-controller";
import { createIndexedDbCatalogCache } from "../catalog/indexeddb-catalog-cache";
import type { ProjectPrimaryAction } from "../catalog/project-view-model";
import type { HostExtensionAdapter } from "../host/host-types";
import { reconcileInventory } from "../inventory/inventory-reconciler";
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
import type { RemovalImpact } from "../lifecycle/removal-impact";
import { assertNotCompanionProject } from "../lifecycle/self-protection";
import { TrustPromptBroker, type PendingTrustPrompt } from "../lifecycle/trust-prompt-broker";
import type { ProfileStore } from "../state/profile-store";
import { createKitDiscoveryController } from "../kits/kit-discovery-controller";
import { createKitExecutor, type KitExecutor } from "../kits/kit-executor";
import { planKitOperation, inventoryFingerprint, type PlannableKit } from "../kits/kit-planner";
import type { KitPlan, KitOperation } from "../kits/kit-plan";
import { prepareImportedKit } from "../kits/kit-portability";
import type { KitReceipt } from "../kits/kit-receipt";
import { KitStore } from "../kits/kit-store";
import type { PersonalKitV1 } from "../kits/kit-types";
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
import type { KitDraftState } from "../kits/kit-draft";
import { KitImportDialog } from "./kits/kit-import-dialog";
import { KitOperationTray } from "./kits/kit-operation-tray";
import { KitPreflightDialog } from "./kits/kit-preflight-dialog";
import { AssessmentWarningDialog } from "./lifecycle/assessment-warning-dialog";
import { OperationTray } from "./lifecycle/operation-tray";
import {
  dispatchPreparedInstallChoice,
  InstallVersionChooser,
} from "./lifecycle/install-version-chooser";
import { RemovalDialog } from "./lifecycle/removal-dialog";
import { TrustDisclosureDialog } from "./lifecycle/trust-disclosure-dialog";
import { CompanionShell } from "./shell/companion-shell";
import { createShellController } from "./shell/shell-controller";

interface CompanionPopupHostProps {
  store?: ProfileStore;
  host?: HostExtensionAdapter;
  runtime?: PopupRuntime | null;
}

export interface PopupRuntime {
  catalog: ReturnType<typeof createCatalogClient>;
  discovery: ReturnType<typeof createDiscoveryController>;
  lifecycle: LifecycleCoordinator;
  prompts: TrustPromptBroker;
  kits: KitStore;
  kitDiscovery: ReturnType<typeof createKitDiscoveryController>;
  kitExecutor: KitExecutor;
  kitContext: { inventory: InventorySnapshot };
}

const emptyInventory = { managed: [], external: [], unknown: [], missingManaged: [] };

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
  const [kitReceipt, setKitReceipt] = useState<KitReceipt | null>(
    parseKitReceipt(store?.read().operationReceipt),
  );
  const [pendingKitPlan, setPendingKitPlan] = useState<Readonly<KitPlan> | null>(null);
  const [kitDisclosurePlan, setKitDisclosurePlan] = useState<Readonly<KitPlan> | null>(null);
  const [kitEditorSource, setKitEditorSource] = useState<PersonalKitV1 | "new" | null>(null);
  const [kitEditorSeed, setKitEditorSeed] = useState<string[]>([]);
  const [importingKit, setImportingKit] = useState(false);
  const [kitInspectors, setKitInspectors] = useState<Record<string, KitInspectorViewModel>>({});
  const [installedKitCards, setInstalledKitCards] = useState<InstalledKitViewModel[]>([]);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [preparingInstall, setPreparingInstall] = useState(false);
  const [pendingInstallChoice, setPendingInstallChoice] = useState<{
    projectId: string;
    projectName: string;
    anchor: HTMLButtonElement;
    choice: Extract<PreparedInstallTargetChoice, { kind: "choose" }>;
  } | null>(null);
  const installFallbacks = useMemo(() => new InstallTargetFallbackBroker(), []);
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
  }, [runtime, store]);

  const refreshInventory = useCallback(async () => {
    if (!runtime || !host || !store) return;
    setOperationError(null);
    setInventoryRefreshing(true);
    try {
      const extensions = await host.discover();
      const snapshot = runtime.catalog.read();
      const inventory = reconcileInventory({
        projects: "catalog" in snapshot ? snapshot.catalog.projects : [],
        hostExtensions: extensions,
        managed: normalizeManagedExtensionMap(store.read().managedExtensions),
      });
      runtime.kitContext.inventory = inventory;
      runtime.discovery.setInventory(inventory);
      await syncKits();
    } catch {
      setOperationError("Could not refresh installed extensions. Try again.");
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
    const unsubscribePrompts = runtime.prompts.subscribe(setPendingPrompt);
    const unsubscribeStore = store?.subscribe((state) => {
      setReceipt(parseReceipt(state.operationReceipt));
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
      unsubscribePrompts();
      unsubscribeStore?.();
      runtime.prompts.cancel();
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshInventory, runtime, store, syncKits]);

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

  const requestKitOperation = (kitId: string, operation: KitOperation) => {
    if (!runtime || !store) return;
    const snapshot = runtime.catalog.read();
    if (!("catalog" in snapshot)) return;
    const kit = resolveKit(runtime, snapshot.catalog, kitId);
    if (!kit) return;
    const plan = planKitOperation({
      operation,
      kit,
      catalog: snapshot.catalog,
      inventory: runtime.kitContext.inventory,
      managed: normalizeManagedExtensionMap(store.read().managedExtensions),
      installedKits: runtime.kits.readInstalledStates(),
      activeKitId: runtime.kits.readActiveId(),
      catalogCanMutate: snapshot.canMutate,
    });
    if (!store.read().trustAcknowledgedAt && plan.install.length) setKitDisclosurePlan(plan);
    else setPendingKitPlan(plan);
  };

  const requestKitAction = (kitId: string, action: KitPrimaryAction | "uninstall") => {
    if (action !== "uninstall" && (action.kind === "review" || action.kind === "view")) return;
    requestKitOperation(
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
    setKitEditorSource(null);
    setKitEditorSeed([]);
    await syncKits();
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
        onRefreshInventory={refreshInventory}
        onToggleExtension={(projectId, internalName, enabled) =>
          void toggleExtension(projectId, internalName, enabled)
        }
        onProjectAction={(projectId, action, anchor) => void runAction(projectId, action, anchor)}
        onOpenExtensionManager={() => void host?.openExtensionManager()}
        onUpdateCompanion={() => void host?.openExtensionManager()}
        onOpenTavernary={() => host?.openExternal("https://tavernary.org/")}
        lifecycleDisabled={
          activeOperation !== null ||
          togglingInternalName !== null ||
          preparingInstall ||
          pendingInstallChoice !== null ||
          pendingInstallFallback !== null
        }
        kitDiscovery={runtime?.kitDiscovery}
        kitInspectors={kitInspectors}
        installedKits={installedKitCards}
        onKitAction={requestKitAction}
        onNewKit={() => {
          setKitEditorSeed([]);
          setKitEditorSource("new");
        }}
        onCreateKitFromSelection={(projectIds) => {
          setKitEditorSeed([...projectIds]);
          setKitEditorSource("new");
        }}
        onImportKit={() => setImportingKit(true)}
        onEditKit={(id) => {
          const kit = runtime?.kits.readDefinition(id);
          if (kit) {
            setKitEditorSeed([]);
            setKitEditorSource(kit);
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
      />
      {kitEditorSource && kitEditorProjects ? (
        <KitEditor
          source={kitEditorSource === "new" ? undefined : kitEditorSource}
          initialProjectIds={kitEditorSource === "new" ? kitEditorSeed : []}
          projects={kitEditorProjects}
          onCancel={() => {
            setKitEditorSource(null);
            setKitEditorSeed([]);
          }}
          onSave={(draft) => void saveKitDraft(draft)}
        />
      ) : null}
      {importingKit && runtime ? (
        <KitImportDialog
          projects={kitEditorProjects ?? []}
          onCancel={() => setImportingKit(false)}
          onImport={(kit) => {
            const prepared = prepareImportedKit(
              kit,
              new Set(runtime.kits.readDefinitions().map(({ id }) => id)),
            );
            void runtime.kits.importDefinition(prepared).then(() => {
              setImportingKit(false);
              void syncKits();
            });
          }}
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
          projectName={pendingInstallChoice.projectName}
          anchor={pendingInstallChoice.anchor}
          choice={pendingInstallChoice.choice}
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
      {pendingInstallFallback && fallbackAnchor.current ? (
        <InstallVersionChooser
          projectName={pendingInstallFallback.projectName}
          anchor={fallbackAnchor.current}
          choice={{
            kind: "choose",
            checked: {
              selection: pendingInstallFallback.checked,
              disabledReason: CHECKED_VERSION_UNAVAILABLE_REASON,
            },
            newest: { selection: pendingInstallFallback.newest },
          }}
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
        error={operationError}
        onDismissReceipt={() => {
          if (receipt) void clearStoredReceipt(store, receipt.id);
          setReceipt(null);
        }}
        onDismissError={() => setOperationError(null)}
        onRetryError={() => void refreshInventory()}
      />
      <KitOperationTray
        active={activeOperation}
        receipt={kitReceipt}
        onDismiss={() => {
          if (kitReceipt) void clearStoredReceipt(store, kitReceipt.id);
          setKitReceipt(null);
        }}
        onRetry={() => {
          if (!kitReceipt) return;
          requestKitOperation(kitReceipt.kitId, retryKitOperation(kitReceipt));
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
  const lifecycle = createLifecycleCoordinator({
    host,
    store,
    getSnapshot: () => catalog.read(),
    confirm: (prompt, project) => prompts.request(prompt, project),
  });
  const lock = lifecycle.lock;
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
      const inventory = reconcileInventory({
        projects: snapshot.catalog.projects,
        hostExtensions: await host.discover(),
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
  });
  return { catalog, discovery, lifecycle, prompts, kits, kitDiscovery, kitExecutor, kitContext };
}

function parseReceipt(value: Record<string, unknown> | null | undefined): LifecycleReceipt | null {
  if (
    !value ||
    typeof value.id !== "string" ||
    (value.kind !== "install" && value.kind !== "remove") ||
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
    !Array.isArray(value.projects) ||
    !value.projects.every(isKitProjectResult) ||
    !Array.isArray(value.keptForOtherKits) ||
    !value.keptForOtherKits.every((item) => typeof item === "string")
  ) {
    return null;
  }
  return structuredClone(value) as unknown as KitReceipt;
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
      result.status === "kept" ||
      result.status === "external") &&
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
  const installedKits = kits.readInstalledStates().map((installed): InstalledKitViewModel => {
    const inspector = inspectors[installed.kitId];
    const currentNames = new Map(
      inspector?.components.map((component) => [component.projectId, component.name]) ?? [],
    );
    const topology = installed.definitionProjectIds ?? [
      ...new Set([...installed.installedProjectIds, ...installed.missingProjectIds]),
    ];
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
      orphaned: !inspector,
    };
  });
  return { statuses, inspectors, installedKits };
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
