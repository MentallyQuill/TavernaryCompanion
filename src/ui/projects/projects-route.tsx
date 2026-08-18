import { useEffect, useRef, useState } from "preact/hooks";

import type { CatalogQuery } from "../../catalog/catalog-core";
import type { DiscoveryState } from "../../catalog/discovery-controller";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import { ActiveFilterChips } from "./active-filter-chips";
import { FilterPanel, type ProjectFacets } from "./filter-panel";
import { ProjectGrid } from "./project-grid";
import { SearchToolbar } from "./search-toolbar";

interface ProjectsRouteProps {
  state: DiscoveryState;
  facets?: ProjectFacets;
  onQueryChange(query: CatalogQuery): void;
  onOpenProject?(id: string): void;
  onProjectAction?(id: string, action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
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
    controls?.[0]?.focus();
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
  const isDefaultScope =
    state.query.frontends.length === 1 &&
    state.query.frontends[0] === "sillytavern" &&
    state.query.kinds.length === 2 &&
    state.query.kinds.includes("extension") &&
    state.query.kinds.includes("preset");
  return (
    <section class="tavernary-companion-projects-route" aria-labelledby="projects-heading">
      <header>
        <h2 id="projects-heading">Projects</h2>
        {isDefaultScope ? (
          <p>
            Showing SillyTavern extensions and presets. Clear filters to explore all Tavernary
            projects.
          </p>
        ) : null}
      </header>
      <SearchToolbar
        query={state.query}
        resultCount={state.projects.length}
        onQueryChange={onQueryChange}
      />
      <button
        ref={filterTrigger}
        type="button"
        class="tavernary-companion-filter-trigger"
        aria-label="Filters"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen(true)}
      >
        Filters
      </button>
      <ActiveFilterChips query={state.query} facets={facets} onQueryChange={onQueryChange} />
      <div class="tavernary-companion-projects-route__workspace">
        <div
          ref={filterSurface}
          role="dialog"
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
        />
      </div>
    </section>
  );
}
