import type { CatalogQuery } from "../../catalog/catalog-core";
import type { ProjectFacets } from "./filter-panel";

interface ActiveFilterChipsProps {
  query: CatalogQuery;
  facets: ProjectFacets;
  onQueryChange(query: CatalogQuery): void;
}

export function ActiveFilterChips({
  query,
  facets,
  onQueryChange,
}: ActiveFilterChipsProps): preact.JSX.Element {
  const frontendLabels = new Map(facets.frontends.map(({ id, label }) => [id, label]));
  const kindLabels = new Map([
    ["frontend", "Frontend"],
    ["extension", "Extension"],
    ["preset", "Preset"],
  ]);
  return (
    <div class="tavernary-companion-filter-chips" aria-label="Active filters">
      {query.frontends.map((id) => {
        const label = frontendLabels.get(id) ?? id;
        return (
          <button
            type="button"
            aria-label={`Remove ${label} filter`}
            onClick={() =>
              onQueryChange({
                ...query,
                frontends: query.frontends.filter((value) => value !== id),
              })
            }
          >
            {label} ×
          </button>
        );
      })}
      {query.kinds.map((id) => {
        const label = kindLabels.get(id) ?? id;
        return (
          <button
            type="button"
            aria-label={`Remove ${label} filter`}
            onClick={() =>
              onQueryChange({
                ...query,
                kinds: query.kinds.filter((value) => value !== id),
              })
            }
          >
            {label} ×
          </button>
        );
      })}
    </div>
  );
}
