import { CATEGORY_OPTIONS, type CatalogQuery } from "../../catalog/catalog-core";
import type { ProjectFacets } from "./filter-panel";

interface ActiveFilterChipsProps {
  query: CatalogQuery;
  facets: ProjectFacets;
  onQueryChange(query: CatalogQuery): void;
}

type ArrayFilter =
  | "frontends"
  | "kinds"
  | "tags"
  | "modelFamilies"
  | "completionFormats"
  | "development"
  | "licenses";

export function ActiveFilterChips({
  query,
  facets,
  onQueryChange,
}: ActiveFilterChipsProps): preact.JSX.Element {
  const labels = {
    frontends: toLabelMap(facets.frontends),
    kinds: toLabelMap(facets.kinds),
    tags: toLabelMap(facets.tags),
    modelFamilies: toLabelMap(facets.modelFamilies),
    completionFormats: toLabelMap(facets.completionFormats),
    development: toLabelMap(facets.development),
    licenses: toLabelMap(facets.licenses),
  } satisfies Record<ArrayFilter, Map<string, string>>;
  const arrayFilters: Array<{ key: ArrayFilter; values: readonly string[] }> = [
    { key: "frontends", values: query.frontends },
    { key: "kinds", values: query.kinds },
    { key: "tags", values: query.tags },
    { key: "modelFamilies", values: query.modelFamilies ?? [] },
    { key: "completionFormats", values: query.completionFormats ?? [] },
    { key: "development", values: query.development },
    { key: "licenses", values: query.licenses },
  ];
  const categoryLabel = CATEGORY_OPTIONS.find(({ id }) => id === query.category)?.label;
  const viewLabel = new Map([
    ["active", "Active catalog view"],
    ["new", "New catalog view"],
    ["released", "Recently released catalog view"],
  ]).get(query.view);

  return (
    <div class="tavernary-companion-filter-chips" aria-label="Active filters">
      {query.category && categoryLabel ? (
        <FilterChip
          label={categoryLabel}
          ariaLabel={`Remove ${categoryLabel} category filter`}
          onRemove={() => onQueryChange({ ...query, category: "" })}
        />
      ) : null}
      {arrayFilters.flatMap(({ key, values }) =>
        values.map((id) => {
          const label = labels[key].get(id) ?? id;
          return (
            <FilterChip
              key={`${key}-${id}`}
              label={label}
              ariaLabel={`Remove ${label} filter`}
              onRemove={() =>
                onQueryChange({
                  ...query,
                  [key]: values.filter((value) => value !== id),
                })
              }
            />
          );
        }),
      )}
      {query.view !== "all" && viewLabel ? (
        <FilterChip
          label={viewLabel}
          ariaLabel={`Remove ${viewLabel} filter`}
          onRemove={() => onQueryChange({ ...query, view: "all" })}
        />
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  ariaLabel,
  onRemove,
}: {
  label: string;
  ariaLabel: string;
  onRemove(): void;
}): preact.JSX.Element {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onRemove}>
      {label} <span aria-hidden="true">×</span>
    </button>
  );
}

function toLabelMap(options: ReadonlyArray<{ id: string; label: string }>): Map<string, string> {
  return new Map(options.map(({ id, label }) => [id, label]));
}
