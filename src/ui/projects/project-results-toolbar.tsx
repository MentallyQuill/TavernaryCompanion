import type { CatalogQuery, CatalogSort } from "../../catalog/catalog-core";
import { CategoryIcon } from "../shared/category-icon";
import { Tooltip } from "../shared/tooltip";

interface ProjectResultsToolbarProps {
  query: CatalogQuery;
  resultCount: number;
  onQueryChange(query: CatalogQuery): void;
}

const sorts: Array<{ id: CatalogSort; label: string }> = [
  { id: "recent", label: "Recent Activity" },
  { id: "date-added", label: "Date Added" },
  { id: "sustained", label: "Sustained Activity" },
  { id: "popularity", label: "Popularity" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "relevance", label: "Relevance" },
];

export function ProjectResultsToolbar({
  query,
  resultCount,
  onQueryChange,
}: ProjectResultsToolbarProps): preact.JSX.Element {
  const densityAction = query.density === "standard" ? "Use compact cards" : "Use standard cards";
  return (
    <div class="tavernary-companion-results-toolbar">
      <output aria-live="polite">
        {resultCount} {resultCount === 1 ? "project" : "projects"}
      </output>
      <Tooltip
        id="tavernary-companion-density-tooltip"
        label={densityAction}
        className="tavernary-companion-control-tooltip"
      >
        <button
          class="tavernary-companion-density-toggle"
          type="button"
          aria-label={densityAction}
          aria-pressed={query.density === "compact"}
          onClick={() =>
            onQueryChange({
              ...query,
              density: query.density === "standard" ? "compact" : "standard",
            })
          }
        >
          <CategoryIcon name="collapse" />
        </button>
      </Tooltip>
      <select
        class="tavernary-companion-project-sort"
        aria-label="Sort projects"
        value={query.sort}
        onChange={(event) =>
          onQueryChange({ ...query, sort: event.currentTarget.value as CatalogSort })
        }
      >
        {sorts.map(({ id, label }) => (
          <option value={id}>{label}</option>
        ))}
      </select>
    </div>
  );
}
