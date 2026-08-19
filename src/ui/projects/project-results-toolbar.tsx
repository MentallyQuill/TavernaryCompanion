import type { CatalogQuery, CatalogSort } from "../../catalog/catalog-core";

interface ProjectResultsToolbarProps {
  query: CatalogQuery;
  resultCount: number;
  onQueryChange(query: CatalogQuery): void;
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
  onQueryChange,
}: ProjectResultsToolbarProps): preact.JSX.Element {
  return (
    <div class="tavernary-companion-results-toolbar">
      <output aria-live="polite">
        {resultCount} {resultCount === 1 ? "project" : "projects"}
      </output>
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
    </div>
  );
}
