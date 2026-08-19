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
  const [compactFilters, setCompactFilters] = useState(true);
  const route = useRef<HTMLElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const filterSurface = useRef<HTMLDivElement>(null);
  const restoreFilterTriggerFocus = useRef(false);
  const closeFilters = () => {
    restoreFilterTriggerFocus.current = true;
    setFiltersOpen(false);
  };
  useEffect(() => {
    const root = route.current?.closest<HTMLElement>(".tavernary-companion-root");
    if (!root) return;
    const syncMode = () => {
      const compact = root.clientWidth <= 1199;
      setCompactFilters(compact);
      if (!compact) setFiltersOpen(false);
    };
    syncMode();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(syncMode);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!filtersOpen || !compactFilters || !filterSurface.current) return;
    const surface = filterSurface.current;
    const root = route.current?.closest<HTMLElement>(".tavernary-companion-root");
    const getControls = () =>
      surface.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
      );
    getControls()[0]?.focus({ preventScroll: true });
    const inerted: Array<{ element: HTMLElement; inert: boolean }> = [];
    if (root) {
      let branch: HTMLElement = surface;
      let parent = branch.parentElement;
      while (parent) {
        for (const child of parent.children) {
          if (child !== branch && child instanceof HTMLElement) {
            inerted.push({ element: child, inert: child.inert });
            child.inert = true;
          }
        }
        if (parent === root) break;
        branch = parent;
        parent = parent.parentElement;
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFilters();
        return;
      }
      const controls = getControls();
      if (event.key !== "Tab" || controls.length === 0) return;
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
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      for (const { element, inert } of inerted) element.inert = inert;
    };
  }, [compactFilters, filtersOpen]);
  useEffect(() => {
    if (filtersOpen || !restoreFilterTriggerFocus.current) return;
    restoreFilterTriggerFocus.current = false;
    filterTrigger.current?.focus();
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
  const clearFiltersFromSurface = () => {
    clearFilters();
    if (filtersOpen) {
      queueMicrotask(() =>
        filterSurface.current
          ?.querySelector<HTMLButtonElement>(".tavernary-companion-filter-close")
          ?.focus(),
      );
    }
  };
  return (
    <section
      ref={route}
      class={`tavernary-companion-projects-route${filtersOpen && compactFilters ? " has-open-filters" : ""}`}
      aria-label="Projects"
    >
      <div class="tavernary-companion-filter-bar">
        <p class="tavernary-companion-catalog-advisory">
          TavernKeeper provides evidence, not a guarantee of safety. Review projects before
          installing.
        </p>
        <button
          ref={filterTrigger}
          type="button"
          class="tavernary-companion-filter-trigger"
          aria-label="Open filters"
          aria-controls="tavernary-companion-project-filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          <FilterIcon />
        </button>
      </div>
      <ProjectResultsToolbar
        query={state.query}
        resultCount={state.projects.length}
        kitSelectionActive={kitSelectionActive}
        onQueryChange={onQueryChange}
        onBeginKitSelection={onBeginKitSelection}
      />
      {hasChangedFilters ? (
        <ActiveFilterChips query={state.query} facets={facets} onQueryChange={onQueryChange} />
      ) : null}
      <div class="tavernary-companion-projects-route__workspace">
        <div
          id="tavernary-companion-project-filters"
          ref={filterSurface}
          role={filtersOpen && compactFilters ? "dialog" : undefined}
          aria-label="Project filters"
          aria-modal={(filtersOpen && compactFilters) || undefined}
          class={`tavernary-companion-filter-surface${filtersOpen ? " is-open" : ""}`}
        >
          <header class="tavernary-companion-filter-surface__header">
            <div>
              <span class="tavernary-companion-filter-surface__eyebrow">Refine catalog</span>
              <h2>Filters</h2>
            </div>
            <button
              type="button"
              class="tavernary-companion-filter-clear"
              aria-label="Clear all filters"
              disabled={!hasChangedFilters}
              onClick={clearFiltersFromSurface}
            >
              Clear all
            </button>
            <button
              type="button"
              class="tavernary-companion-filter-close"
              aria-label="Close filters"
              onClick={closeFilters}
            >
              <CloseIcon />
            </button>
          </header>
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

function FilterIcon(): preact.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  );
}

function CloseIcon(): preact.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}
