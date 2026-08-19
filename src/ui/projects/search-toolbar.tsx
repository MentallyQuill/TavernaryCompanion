import type { CatalogQuery, CatalogSort } from "../../catalog/catalog-core";

interface SearchToolbarProps {
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

export function SearchToolbar({
  query,
  resultCount,
  onQueryChange,
}: SearchToolbarProps): preact.JSX.Element {
  return (
    <div class="tavernary-companion-search-toolbar">
      <label>
        <span>Search projects</span>
        <input
          type="search"
          aria-label="Search projects"
          value={query.search}
          onInput={(event) => onQueryChange({ ...query, search: event.currentTarget.value })}
        />
      </label>
      <label>
        <span>Sort</span>
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
      </label>
      <output aria-live="polite">{resultCount} projects</output>
    </div>
  );
}
