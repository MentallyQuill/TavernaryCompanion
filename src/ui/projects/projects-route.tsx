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
}: ProjectsRouteProps): preact.JSX.Element {
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
      <ActiveFilterChips query={state.query} facets={facets} onQueryChange={onQueryChange} />
      <div class="tavernary-companion-projects-route__workspace">
        <FilterPanel query={state.query} facets={facets} onQueryChange={onQueryChange} />
        <ProjectGrid
          projects={state.projects}
          onOpenProject={onOpenProject}
          onProjectAction={onProjectAction}
        />
      </div>
    </section>
  );
}
