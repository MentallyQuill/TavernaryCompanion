import { useEffect, useRef, useState } from "preact/hooks";

import { DEFAULT_COMPANION_QUERY, type CatalogQuery } from "../../catalog/catalog-core";
import type { DiscoveryState } from "../../catalog/discovery-controller";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import { ActiveFilterChips } from "./active-filter-chips";
import { FilterPanel, type ProjectFacets } from "./filter-panel";
import { ProjectGrid } from "./project-grid";
import { ProjectResultsToolbar } from "./project-results-toolbar";
import { KitSelectionDock } from "../kits/kit-selection-dock";

interface ProjectsRouteProps {
  state: DiscoveryState;
  facets?: ProjectFacets;
  onQueryChange(query: CatalogQuery): void;
  onOpenProject?(id: string): void;
  onProjectAction?(id: string, action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
  kitSelectionActive?: boolean;
  selectedKitProjectIds?: readonly string[];
  onBeginKitSelection?(): void;
  onToggleKitSelection?(projectId: string): void;
  onReviewKitSelection?(): void;
  onCancelKitSelection?(): void;
  visibleProjectCount?: number;
  onVisibleProjectCountChange?(count: number): void;
}

const defaultFacets: ProjectFacets = {
  frontends: [{ id: "sillytavern", label: "SillyTavern" }],
  tags: [],
};

export function ProjectsRoute({
  state,
  facets = state.facets ?? defaultFacets,
  onQueryChange,
  onOpenProject = () => undefined,
  onProjectAction = () => undefined,
  onManageInSillyTavern,
  lifecycleDisabled,
  kitSelectionActive = false,
  selectedKitProjectIds = [],
  onBeginKitSelection,
  onToggleKitSelection,
  onReviewKitSelection,
  onCancelKitSelection,
  visibleProjectCount,
  onVisibleProjectCountChange,
}: ProjectsRouteProps): preact.JSX.Element {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const filterSurface = useRef<HTMLDivElement>(null);
  const closeFilters = () => {
    setFiltersOpen(false);
    queueMicrotask(() => filterTrigger.current?.focus());
  };
  useEffect(() => {
    if (!filtersOpen) return;
    const controls = filterSurface.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
    );
    controls?.[0]?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFilters();
        return;
      }
      if (event.key !== "Tab" || !controls || controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);
  const hasChangedFilters =
    !sameValues(state.query.frontends, DEFAULT_COMPANION_QUERY.frontends) ||
    !sameValues(state.query.kinds, DEFAULT_COMPANION_QUERY.kinds) ||
    state.query.category !== DEFAULT_COMPANION_QUERY.category ||
    state.query.tags.length > 0 ||
    (state.query.modelFamilies?.length ?? 0) > 0 ||
    (state.query.completionFormats?.length ?? 0) > 0 ||
    state.query.development.length > 0 ||
    state.query.licenses.length > 0 ||
    state.query.view !== DEFAULT_COMPANION_QUERY.view;
  const clearFilters = () =>
    onQueryChange({
      ...structuredClone(DEFAULT_COMPANION_QUERY),
      search: state.query.search,
      sort: state.query.sort,
    });
  return (
    <section class="tavernary-companion-projects-route" aria-label="Projects">
      <p class="tavernary-companion-catalog-advisory">
        TavernKeeper provides evidence, not a guarantee of safety. Review projects before
        installing.
      </p>
      <ProjectResultsToolbar
        query={state.query}
        resultCount={state.projects.length}
        filtersOpen={filtersOpen}
        filterTrigger={filterTrigger}
        kitSelectionActive={kitSelectionActive}
        showClearFilters={hasChangedFilters}
        onQueryChange={onQueryChange}
        onOpenFilters={() => setFiltersOpen(true)}
        onClearFilters={clearFilters}
        onBeginKitSelection={onBeginKitSelection}
      />
      {hasChangedFilters ? (
        <ActiveFilterChips query={state.query} facets={facets} onQueryChange={onQueryChange} />
      ) : null}
      <div class="tavernary-companion-projects-route__workspace">
        <div
          ref={filterSurface}
          role={filtersOpen ? "dialog" : undefined}
          aria-label="Project filters"
          aria-modal={filtersOpen || undefined}
          class={`tavernary-companion-filter-surface${filtersOpen ? " is-open" : ""}`}
        >
          <button type="button" class="tavernary-companion-filter-close" onClick={closeFilters}>
            Close filters
          </button>
          <FilterPanel query={state.query} facets={facets} onQueryChange={onQueryChange} />
        </div>
        <ProjectGrid
          projects={state.projects}
          onOpenProject={onOpenProject}
          onProjectAction={onProjectAction}
          onManageInSillyTavern={onManageInSillyTavern}
          lifecycleDisabled={lifecycleDisabled}
          kitSelectionActive={kitSelectionActive}
          selectedKitProjectIds={selectedKitProjectIds}
          onToggleKitSelection={onToggleKitSelection}
          visibleCount={visibleProjectCount}
          onVisibleCountChange={onVisibleProjectCountChange}
        />
      </div>
      {kitSelectionActive ? (
        <KitSelectionDock
          count={selectedKitProjectIds.length}
          onReview={() => onReviewKitSelection?.()}
          onCancel={() => onCancelKitSelection?.()}
        />
      ) : null}
    </section>
  );
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}
