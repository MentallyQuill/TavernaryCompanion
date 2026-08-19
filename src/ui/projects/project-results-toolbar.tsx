import type { RefObject } from "preact";

import type { CatalogQuery, CatalogSort } from "../../catalog/catalog-core";

interface ProjectResultsToolbarProps {
  query: CatalogQuery;
  resultCount: number;
  filtersOpen: boolean;
  filterTrigger: RefObject<HTMLButtonElement>;
  kitSelectionActive: boolean;
  showClearFilters: boolean;
  onQueryChange(query: CatalogQuery): void;
  onOpenFilters(): void;
  onClearFilters(): void;
  onBeginKitSelection?(): void;
}

const sorts: Array<{ id: CatalogSort; label: string }> = [
  { id: "recent", label: "Recently active" },
  { id: "date-added", label: "Date added" },
  { id: "sustained", label: "Sustained activity" },
  { id: "popularity", label: "Popularity" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "relevance", label: "Relevance" },
];

export function ProjectResultsToolbar({
  query,
  resultCount,
  filtersOpen,
  filterTrigger,
  kitSelectionActive,
  showClearFilters,
  onQueryChange,
  onOpenFilters,
  onClearFilters,
  onBeginKitSelection,
}: ProjectResultsToolbarProps): preact.JSX.Element {
  return (
    <div class="tavernary-companion-results-toolbar">
      <output aria-live="polite">
        {resultCount} {resultCount === 1 ? "project" : "projects"}
      </output>
      {showClearFilters ? (
        <button
          type="button"
          class="tavernary-companion-results-toolbar__clear"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      ) : null}
      <select
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
      <button
        ref={filterTrigger}
        type="button"
        class="tavernary-companion-filter-trigger"
        aria-label="Filters"
        aria-expanded={filtersOpen}
        onClick={onOpenFilters}
      >
        Filters
      </button>
      <button
        type="button"
        class="tavernary-companion-select-kit"
        disabled={kitSelectionActive}
        onClick={onBeginKitSelection}
      >
        Select for Kit
      </button>
    </div>
  );
}
