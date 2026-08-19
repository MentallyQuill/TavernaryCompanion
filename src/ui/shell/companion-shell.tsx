import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

import type { CatalogSnapshot } from "../../catalog/catalog-client";
import { DEFAULT_COMPANION_QUERY, type CatalogQuery } from "../../catalog/catalog-core";
import type { DiscoveryController } from "../../catalog/discovery-controller";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import type { KitDiscoveryController } from "../../kits/kit-discovery-controller";
import type { KitInspectorViewModel, KitPrimaryAction } from "../../kits/kit-view-model";
import type { ProjectFacets } from "../projects/filter-panel";
import { InstalledRoute } from "../installed/installed-route";
import { KitInspector } from "../kits/kit-inspector";
import { KitsRoute } from "../kits/kits-route";
import { CatalogStatePanel } from "../catalog/catalog-state-panel";
import { ProjectsRoute } from "../projects/projects-route";
import type { ShellController } from "./shell-controller";
import { CatalogNavigation } from "./catalog-navigation";
import { ShellHeader } from "./shell-header";

interface CompanionShellProps {
  controller: ShellController;
  discovery?: DiscoveryController;
  facets?: ProjectFacets;
  onProjectAction?(id: string, action: ProjectPrimaryAction): void;
  onRefreshInventory?(): void | Promise<void>;
  inventoryRefreshing?: boolean;
  togglingInternalName?: string | null;
  onToggleExtension?(projectId: string, internalName: string, enabled: boolean): void;
  onOpenExtensionManager?(): void;
  lifecycleDisabled?: boolean;
  kitDiscovery?: KitDiscoveryController;
  kitInspectors?: Readonly<Record<string, KitInspectorViewModel>>;
  onKitAction?(id: string, action: KitPrimaryAction): void;
  onNewKit?(): void;
  onImportKit?(): void;
  onEditKit?(id: string): void;
  onCopyKit?(id: string): void;
  onExportKit?(id: string): void;
  onUninstallKit?(id: string): void;
  onDuplicateKit?(id: string): void;
  onRemoveKit?(id: string): void;
  onCreateKitFromSelection?(projectIds: readonly string[]): void;
  activeKitId?: string | null;
  catalogSnapshot?: CatalogSnapshot;
  catalogRefreshing?: boolean;
  onRefreshCatalog?(): void | Promise<void>;
  onUpdateCompanion?(): void;
  onUseCachedCatalog?(): void;
  onOpenTavernary?(): void;
  onRequestClose?: () => void;
}

const noRefresh = () => undefined;
const noAction = () => undefined;
const INITIAL_PROJECT_COUNT = 30;

export function CompanionShell({
  controller,
  discovery,
  facets,
  onProjectAction,
  onRefreshInventory = noRefresh,
  inventoryRefreshing = false,
  togglingInternalName = null,
  onToggleExtension,
  onOpenExtensionManager,
  lifecycleDisabled = false,
  kitDiscovery,
  kitInspectors = {},
  onKitAction,
  onNewKit,
  onImportKit,
  onEditKit,
  onCopyKit,
  onExportKit,
  onUninstallKit,
  onDuplicateKit,
  onRemoveKit,
  onCreateKitFromSelection,
  activeKitId = null,
  catalogSnapshot,
  catalogRefreshing = false,
  onRefreshCatalog = noRefresh,
  onUpdateCompanion = noAction,
  onUseCachedCatalog = noAction,
  onOpenTavernary = noAction,
  onRequestClose,
}: CompanionShellProps): preact.JSX.Element {
  const [state, setState] = useState(controller.read());
  const [discoveryState, setDiscoveryState] = useState(discovery?.read() ?? null);
  const [kitSelection, setKitSelection] = useState<string[] | null>(null);
  const [visibleProjectCount, setVisibleProjectCount] = useState(INITIAL_PROJECT_COUNT);

  useEffect(() => controller.subscribe(setState), [controller]);
  useEffect(() => {
    if (!discovery) return;
    setDiscoveryState(discovery.read());
    return discovery.subscribe(setDiscoveryState);
  }, [discovery]);
  useEffect(() => {
    const onPopState = () => restoreAfterBack(controller);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [controller]);

  const detail = state.detailStack.at(-1);
  const updateProjectQuery = (query: CatalogQuery) => {
    setVisibleProjectCount(INITIAL_PROJECT_COUNT);
    discovery?.setQuery(query);
  };
  const headerCatalogSnapshot = catalogSnapshot?.state.startsWith("ready-")
    ? catalogSnapshot
    : undefined;
  return (
    <section
      class="tavernary-companion-shell"
      aria-labelledby="tavernary-companion-heading"
      data-testid="companion-shell"
    >
      <ShellHeader
        search={
          !detail && state.route === "projects" && discoveryState
            ? {
                value: discoveryState.query.search,
                onChange: (search) => updateProjectQuery({ ...discoveryState.query, search }),
              }
            : undefined
        }
        onRequestClose={onRequestClose}
        catalogSnapshot={headerCatalogSnapshot}
        catalogRefreshing={catalogRefreshing}
        onRefreshCatalog={headerCatalogSnapshot ? () => void onRefreshCatalog() : undefined}
      />
      <CatalogNavigation
        route={state.route}
        query={discoveryState?.query ?? DEFAULT_COMPANION_QUERY}
        onNavigate={(route) => controller.navigate(route)}
        onQueryChange={updateProjectQuery}
      />
      <main class="tavernary-companion-shell__content">
        <CatalogBoundary
          snapshot={catalogSnapshot}
          onRefresh={onRefreshCatalog}
          onUpdateCompanion={onUpdateCompanion}
          onUseCached={onUseCachedCatalog}
          onOpenTavernary={onOpenTavernary}
        >
          {!detail && state.route === "projects" ? (
            <>
              {discovery && discoveryState ? (
                <ProjectsRoute
                  state={discoveryState}
                  facets={facets ?? discoveryState.facets}
                  onQueryChange={updateProjectQuery}
                  onProjectAction={(id, action) => onProjectAction?.(id, action)}
                  onManageInSillyTavern={onOpenExtensionManager}
                  lifecycleDisabled={lifecycleDisabled}
                  kitSelectionActive={kitSelection !== null}
                  selectedKitProjectIds={kitSelection ?? []}
                  onToggleKitSelection={(projectId) =>
                    setKitSelection((current) => {
                      if (!current) return [projectId];
                      return current.includes(projectId)
                        ? current.filter((id) => id !== projectId)
                        : [...current, projectId];
                    })
                  }
                  onReviewKitSelection={() => {
                    if (!kitSelection?.length) return;
                    onCreateKitFromSelection?.(kitSelection);
                    setKitSelection(null);
                  }}
                  onCancelKitSelection={() => setKitSelection(null)}
                  visibleProjectCount={visibleProjectCount}
                  onVisibleProjectCountChange={setVisibleProjectCount}
                />
              ) : (
                <h2 id="tavernary-companion-projects-heading">Projects</h2>
              )}
            </>
          ) : null}
          {!detail && state.route === "kits" ? (
            <>
              {kitDiscovery ? (
                <KitsRoute
                  controller={kitDiscovery}
                  lifecycleDisabled={lifecycleDisabled}
                  onOpenKit={(id) =>
                    controller.openDetail({ kind: "kit", id, focusKey: `kit-${id}` })
                  }
                  onAction={(id, action) => {
                    if (action.kind === "review" || action.kind === "view") {
                      controller.openDetail({ kind: "kit", id, focusKey: `kit-${id}` });
                    } else {
                      onKitAction?.(id, action);
                    }
                  }}
                  onNewKit={onNewKit}
                  onImport={onImportKit}
                  switcherKits={Object.values(kitInspectors)}
                  activeKitId={activeKitId}
                  onActivate={(id) => onKitAction?.(id, { kind: "activate", label: "Activate" })}
                  onDeactivate={() => {
                    if (activeKitId)
                      onKitAction?.(activeKitId, { kind: "deactivate", label: "Deactivate" });
                  }}
                />
              ) : (
                <h2 id="tavernary-companion-kits-heading">Kits</h2>
              )}
            </>
          ) : null}
          {!detail && state.route === "installed" ? (
            <>
              {discoveryState ? (
                <InstalledRoute
                  sections={discoveryState.installedSections}
                  kits={Object.values(kitInspectors)}
                  activeKitId={activeKitId}
                  refreshing={inventoryRefreshing}
                  togglingInternalName={togglingInternalName}
                  onRefresh={onRefreshInventory}
                  onAction={(id, action) => onProjectAction?.(id, action)}
                  onManage={onOpenExtensionManager}
                  onOpenKit={(id) =>
                    controller.openDetail({ kind: "kit", id, focusKey: `installed-kit-${id}` })
                  }
                  onToggleExtension={onToggleExtension}
                  lifecycleDisabled={lifecycleDisabled}
                />
              ) : (
                <h2 id="tavernary-companion-installed-heading">Installed extensions</h2>
              )}
            </>
          ) : null}
          {detail ? (
            <section aria-label="kit detail">
              <button type="button" onClick={() => restoreAfterBack(controller)}>
                Back
              </button>
              {kitInspectors[detail.id] ? (
                <KitInspector
                  kit={kitInspectors[detail.id]}
                  disabled={lifecycleDisabled}
                  onAction={(action) => onKitAction?.(detail.id, action)}
                  onEdit={() => onEditKit?.(detail.id)}
                  onCopy={() => onCopyKit?.(detail.id)}
                  onExport={() => onExportKit?.(detail.id)}
                  onUninstall={() => onUninstallKit?.(detail.id)}
                  onDuplicate={() => onDuplicateKit?.(detail.id)}
                  onRemove={() => {
                    onRemoveKit?.(detail.id);
                    restoreAfterBack(controller);
                  }}
                />
              ) : (
                <h2>{detail.id}</h2>
              )}
            </section>
          ) : null}
        </CatalogBoundary>
      </main>
    </section>
  );
}

function CatalogBoundary({
  snapshot,
  onRefresh,
  onUpdateCompanion,
  onUseCached,
  onOpenTavernary,
  children,
}: {
  snapshot?: CatalogSnapshot;
  onRefresh(): void | Promise<void>;
  onUpdateCompanion(): void;
  onUseCached(): void;
  onOpenTavernary(): void;
  children: ComponentChildren;
}): preact.JSX.Element {
  if (!snapshot) return <>{children}</>;
  return (
    <CatalogStatePanel
      snapshot={snapshot}
      onRefresh={onRefresh}
      onUpdateCompanion={onUpdateCompanion}
      onUseCached={onUseCached}
      onOpenTavernary={onOpenTavernary}
    >
      {children}
    </CatalogStatePanel>
  );
}

function restoreAfterBack(controller: ShellController): void {
  const result = controller.back();
  if (!result.handled || !result.focusKey) return;
  queueMicrotask(() => {
    const candidates = document.querySelectorAll<HTMLElement>("[data-focus-key]");
    for (const candidate of candidates) {
      if (candidate.dataset.focusKey === result.focusKey) {
        candidate.focus();
        return;
      }
    }
  });
}
