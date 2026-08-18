import { render } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";

import { createCatalogClient, type CatalogSnapshot } from "../catalog/catalog-client";
import { createDiscoveryController } from "../catalog/discovery-controller";
import { createIndexedDbCatalogCache } from "../catalog/indexeddb-catalog-cache";
import type { ProjectPrimaryAction } from "../catalog/project-view-model";
import type { HostExtensionAdapter } from "../host/host-types";
import { reconcileInventory } from "../inventory/inventory-reconciler";
import { normalizeManagedExtensionMap } from "../inventory/managed-registry";
import {
  createLifecycleCoordinator,
  type LifecycleCoordinator,
} from "../lifecycle/lifecycle-coordinator";
import type { ActiveOperation } from "../lifecycle/operation-lock";
import type { LifecycleReceipt } from "../lifecycle/operation-receipt";
import type { RemovalImpact } from "../lifecycle/removal-impact";
import { TrustPromptBroker, type PendingTrustPrompt } from "../lifecycle/trust-prompt-broker";
import type { ProfileStore } from "../state/profile-store";
import { AssessmentWarningDialog } from "./lifecycle/assessment-warning-dialog";
import { OperationTray } from "./lifecycle/operation-tray";
import { RemovalDialog } from "./lifecycle/removal-dialog";
import { TrustDisclosureDialog } from "./lifecycle/trust-disclosure-dialog";
import { CompanionShell } from "./shell/companion-shell";
import { createShellController } from "./shell/shell-controller";

interface CompanionPopupHostProps {
  store?: ProfileStore;
  host?: HostExtensionAdapter;
}

interface PopupRuntime {
  catalog: ReturnType<typeof createCatalogClient>;
  discovery: ReturnType<typeof createDiscoveryController>;
  lifecycle: LifecycleCoordinator;
  prompts: TrustPromptBroker;
}

const emptyInventory = { managed: [], external: [], unknown: [], missingManaged: [] };

export function CompanionPopupHost({ store, host }: CompanionPopupHostProps): preact.JSX.Element {
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
  const runtime = useMemo(() => createPopupRuntime(store, host), [host, store]);
  const [catalogSnapshot, setCatalogSnapshot] = useState<CatalogSnapshot | undefined>(
    runtime?.catalog.read(),
  );
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [inventoryRefreshing, setInventoryRefreshing] = useState(false);
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
  const [operationError, setOperationError] = useState<string | null>(null);

  const refreshInventory = useCallback(async () => {
    if (!runtime || !host || !store) return;
    setInventoryRefreshing(true);
    try {
      const extensions = await host.discover();
      const snapshot = runtime.catalog.read();
      runtime.discovery.setInventory(
        reconcileInventory({
          projects: "catalog" in snapshot ? snapshot.catalog.projects : [],
          hostExtensions: extensions,
          managed: normalizeManagedExtensionMap(store.read().managedExtensions),
        }),
      );
    } finally {
      setInventoryRefreshing(false);
    }
  }, [host, runtime, store]);

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
    });
    const onFocus = () => void runtime.catalog.onFocus();
    window.addEventListener("focus", onFocus);
    setCatalogRefreshing(true);
    void runtime.catalog.open().finally(() => setCatalogRefreshing(false));
    return () => {
      unsubscribeCatalog();
      unsubscribeLock();
      unsubscribePrompts();
      unsubscribeStore?.();
      runtime.prompts.cancel();
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshInventory, runtime, store]);

  const runAction = async (projectId: string, action: ProjectPrimaryAction) => {
    if (!runtime || !host) return;
    setOperationError(null);
    try {
      if (action.kind === "install") {
        const result = await runtime.lifecycle.install(projectId);
        setReceipt(result);
        await refreshInventory();
      } else if (action.kind === "uninstall") {
        setRemovalImpact(await runtime.lifecycle.previewRemoval(projectId));
      } else if (action.kind === "update-required" || action.kind === "manage-in-sillytavern") {
        await host.openExtensionManager();
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "The operation could not finish.");
    }
  };

  return (
    <>
      <CompanionShell
        controller={shell}
        discovery={runtime?.discovery}
        catalogSnapshot={catalogSnapshot}
        catalogRefreshing={catalogRefreshing}
        inventoryRefreshing={inventoryRefreshing}
        onRefreshCatalog={refreshCatalog}
        onRefreshInventory={refreshInventory}
        onProjectAction={(projectId, action) => void runAction(projectId, action)}
        onOpenExtensionManager={() => void host?.openExtensionManager()}
        onUpdateCompanion={() => void host?.openExtensionManager()}
        onOpenTavernary={() => host?.openExternal("https://tavernary.org/")}
        lifecycleDisabled={activeOperation !== null}
      />
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
        active={activeOperation}
        receipt={receipt}
        error={operationError}
        onDismissReceipt={() => setReceipt(null)}
        onDismissError={() => setOperationError(null)}
      />
    </>
  );
}

function createPopupRuntime(
  store: ProfileStore | undefined,
  host: HostExtensionAdapter | undefined,
): PopupRuntime | null {
  if (!store || !host || !globalThis.indexedDB) return null;
  const catalog = createCatalogClient({ cache: createIndexedDbCatalogCache() });
  const discovery = createDiscoveryController({
    snapshot: catalog.read(),
    inventory: emptyInventory,
  });
  const prompts = new TrustPromptBroker();
  const lifecycle = createLifecycleCoordinator({
    host,
    store,
    getSnapshot: () => catalog.read(),
    confirm: (prompt, project) => prompts.request(prompt, project),
  });
  return { catalog, discovery, lifecycle, prompts };
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

export function renderCompanionPopup(
  container: HTMLElement,
  options: CompanionPopupHostProps = {},
): () => void {
  render(<CompanionPopupHost {...options} />, container);
  return () => render(null, container);
}
