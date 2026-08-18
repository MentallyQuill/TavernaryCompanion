import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

import type { CatalogSnapshot } from "../../catalog/catalog-client";
import type { DiscoveryController } from "../../catalog/discovery-controller";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import type { ProjectFacets } from "../projects/filter-panel";
import { InstalledRoute } from "../installed/installed-route";
import { CatalogStatePanel } from "../catalog/catalog-state-panel";
import { ProjectDetail } from "../projects/project-detail";
import { ProjectsRoute } from "../projects/projects-route";
import type { ShellController } from "./shell-controller";
import { ShellHeader } from "./shell-header";
import { RouteTabs } from "./route-tabs";

interface ShellProjectStub {
  id: string;
  name: string;
}

interface CompanionShellProps {
  controller: ShellController;
  projects?: ShellProjectStub[];
  discovery?: DiscoveryController;
  facets?: ProjectFacets;
  onProjectAction?(id: string, action: ProjectPrimaryAction): void;
  onRefreshInventory?(): void | Promise<void>;
  inventoryRefreshing?: boolean;
  onOpenExtensionManager?(): void;
  lifecycleDisabled?: boolean;
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

export function CompanionShell({
  controller,
  projects = [],
  discovery,
  facets,
  onProjectAction,
  onRefreshInventory = noRefresh,
  inventoryRefreshing = false,
  onOpenExtensionManager,
  lifecycleDisabled = false,
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
  return (
    <section
      class="tavernary-companion-shell"
      aria-labelledby="tavernary-companion-heading"
      data-testid="companion-shell"
    >
      <ShellHeader
        onRequestClose={onRequestClose}
        catalogSnapshot={catalogSnapshot}
        catalogRefreshing={catalogRefreshing}
        onRefreshCatalog={catalogSnapshot ? () => void onRefreshCatalog() : undefined}
      />
      <RouteTabs route={state.route} onNavigate={(route) => controller.navigate(route)} />
      <main class="tavernary-companion-shell__content">
        <CatalogBoundary
          snapshot={catalogSnapshot}
          onRefresh={onRefreshCatalog}
          onUpdateCompanion={onUpdateCompanion}
          onUseCached={onUseCachedCatalog}
          onOpenTavernary={onOpenTavernary}
        >
          <section
            aria-labelledby="tavernary-companion-projects-heading"
            hidden={state.route !== "projects" || Boolean(detail)}
          >
            {discovery && discoveryState ? (
              <ProjectsRoute
                state={discoveryState}
                facets={facets ?? discoveryState.facets}
                onQueryChange={(query) => discovery.setQuery(query)}
                onOpenProject={(id) =>
                  controller.openDetail({ kind: "project", id, focusKey: `project-${id}` })
                }
                onProjectAction={(id, action) => {
                  if (action.kind === "view-project") {
                    controller.openDetail({ kind: "project", id, focusKey: `project-${id}` });
                  } else {
                    onProjectAction?.(id, action);
                  }
                }}
                onManageInSillyTavern={onOpenExtensionManager}
                lifecycleDisabled={lifecycleDisabled}
              />
            ) : (
              <>
                <h2 id="tavernary-companion-projects-heading">Projects</h2>
                {projects.map((project) => {
                  const focusKey = `project-${project.id}`;
                  return (
                    <button
                      type="button"
                      data-focus-key={focusKey}
                      aria-label={`View ${project.name}`}
                      onClick={() =>
                        controller.openDetail({ kind: "project", id: project.id, focusKey })
                      }
                    >
                      {project.name}
                    </button>
                  );
                })}
              </>
            )}
          </section>
          <section
            aria-labelledby="tavernary-companion-kits-heading"
            hidden={state.route !== "kits" || Boolean(detail)}
          >
            <h2 id="tavernary-companion-kits-heading">Kits</h2>
          </section>
          <section
            aria-labelledby="tavernary-companion-installed-heading"
            hidden={state.route !== "installed" || Boolean(detail)}
          >
            {discoveryState ? (
              <InstalledRoute
                sections={discoveryState.installedSections}
                refreshing={inventoryRefreshing}
                onRefresh={onRefreshInventory}
                onOpenProject={(id) =>
                  controller.openDetail({ kind: "project", id, focusKey: `installed-${id}` })
                }
                onAction={(id, action) => onProjectAction?.(id, action)}
                onManage={onOpenExtensionManager}
                lifecycleDisabled={lifecycleDisabled}
              />
            ) : (
              <h2 id="tavernary-companion-installed-heading">Installed extensions</h2>
            )}
          </section>
          {detail ? (
            <section aria-label={`${detail.kind} detail`}>
              <button type="button" onClick={() => restoreAfterBack(controller)}>
                Back
              </button>
              {detail.kind === "project" && discoveryState?.projectDetails[detail.id] ? (
                <ProjectDetail
                  project={discoveryState.projectDetails[detail.id]}
                  onAction={(action) => onProjectAction?.(detail.id, action)}
                  onManageInSillyTavern={onOpenExtensionManager}
                  lifecycleDisabled={lifecycleDisabled}
                />
              ) : (
                <h2>{projectName(projects, discoveryState, detail.id)}</h2>
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

function projectName(
  projects: ShellProjectStub[],
  discoveryState: ReturnType<DiscoveryController["read"]> | null,
  id: string,
): string {
  return (
    projects.find((project) => project.id === id)?.name ??
    discoveryState?.projects.find((project) => project.id === id)?.name ??
    id
  );
}
