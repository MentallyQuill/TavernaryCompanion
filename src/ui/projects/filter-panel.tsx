import { useState } from "preact/hooks";

import type {
  CatalogKind,
  CatalogQuery,
  DevelopmentFilter,
  LicenseFilter,
} from "../../catalog/catalog-core";
import type { DiscoveryFacet, DiscoveryTagFacet } from "../../catalog/discovery-controller";
import { FilterChoice } from "./filter-choice";
import { FilterGroup } from "./filter-controls";

export interface ProjectFacets {
  frontends: DiscoveryFacet[];
  kinds: DiscoveryFacet[];
  tags: DiscoveryTagFacet[];
  modelFamilies: DiscoveryFacet[];
  completionFormats: DiscoveryFacet[];
  development: DiscoveryFacet[];
  licenses: DiscoveryFacet[];
}

interface FilterPanelProps {
  query: CatalogQuery;
  facets: ProjectFacets;
  onQueryChange(query: CatalogQuery): void;
}

export function FilterPanel({
  query,
  facets,
  onQueryChange,
}: FilterPanelProps): preact.JSX.Element {
  return (
    <aside class="tavernary-companion-filter-panel" aria-label="Project filters">
      <FilterGroup
        title="Compatible frontend"
        options={facets.frontends}
        selected={query.frontends}
        onToggle={(id) => onQueryChange({ ...query, frontends: toggle(query.frontends, id) })}
        searchLabel="Search compatible frontends"
        initialVisibleCount={3}
      />
      <FilterGroup
        title="Project kind"
        options={facets.kinds}
        selected={query.kinds}
        onToggle={(id) =>
          onQueryChange({ ...query, kinds: toggle(query.kinds, id) as CatalogKind[] })
        }
        kindColors
      />
      <TagBrowser
        tags={facets.tags}
        selected={query.tags}
        onToggle={(id) => onQueryChange({ ...query, tags: toggle(query.tags, id) })}
      />
      <FilterGroup
        title="Model family"
        options={facets.modelFamilies}
        selected={query.modelFamilies ?? []}
        onToggle={(id) =>
          onQueryChange({
            ...query,
            modelFamilies: toggle(query.modelFamilies ?? [], id),
          })
        }
        presentation="chips"
      />
      <FilterGroup
        title="Completion format"
        options={facets.completionFormats}
        selected={query.completionFormats ?? []}
        onToggle={(id) =>
          onQueryChange({
            ...query,
            completionFormats: toggle(query.completionFormats ?? [], id),
          })
        }
        presentation="chips"
      />
      <FilterGroup
        title="Development"
        options={facets.development}
        selected={query.development}
        onToggle={(id) =>
          onQueryChange({
            ...query,
            development: toggle(query.development, id) as DevelopmentFilter[],
          })
        }
      />
      <FilterGroup
        title="License"
        options={facets.licenses}
        selected={query.licenses}
        onToggle={(id) =>
          onQueryChange({
            ...query,
            licenses: toggle(query.licenses, id) as LicenseFilter[],
          })
        }
      />
    </aside>
  );
}

function TagBrowser({
  tags,
  selected,
  onToggle,
}: {
  tags: readonly DiscoveryTagFacet[];
  selected: readonly string[];
  onToggle(id: string): void;
}): preact.JSX.Element | null {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({ goal: false, trait: false });
  if (tags.length === 0) return null;

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleTags = tags.filter(
    ({ id, label }) =>
      !normalizedSearch ||
      id.toLocaleLowerCase().includes(normalizedSearch) ||
      label.toLocaleLowerCase().includes(normalizedSearch),
  );
  const selectedTags = selected
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is DiscoveryTagFacet => tag !== undefined);

  return (
    <section
      class="tavernary-companion-filter-tag-browser"
      aria-labelledby="tavernary-companion-project-tag-filter-heading"
    >
      <h3 id="tavernary-companion-project-tag-filter-heading">Goals &amp; traits</h3>
      <div class="tavernary-companion-tag-browser">
        <input
          class="tavernary-companion-filter-search"
          type="search"
          value={search}
          placeholder="Search tags…"
          aria-label="Search goals and traits"
          onInput={(event) => setSearch(event.currentTarget.value)}
        />
        <div class="tavernary-companion-tag-browser__status">
          <span aria-live="polite">{selected.length} selected</span>
        </div>
        {selectedTags.length ? (
          <div
            class="tavernary-companion-tag-browser__selected"
            aria-label="Selected goals and traits"
          >
            {selectedTags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                aria-label={`Remove ${tag.label}`}
                onClick={() => onToggle(tag.id)}
              >
                <span aria-hidden="true">✓</span>
                <span>{tag.label}</span>
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}
        <div class="tavernary-companion-tag-browser__facets">
          {(
            [
              ["goal", "Goals"],
              ["trait", "Traits"],
            ] as const
          ).map(([facet, label]) => {
            const group = visibleTags
              .filter((tag) => tag.facet === facet)
              .sort(
                (left, right) => right.count - left.count || left.label.localeCompare(right.label),
              );
            if (group.length === 0) return null;
            const shown = normalizedSearch || expanded[facet] ? group : group.slice(0, 8);
            const hiddenCount = group.length - shown.length;
            return (
              <fieldset key={facet} class="tavernary-companion-tag-browser__group">
                <legend>{label}</legend>
                <div class="tavernary-companion-tag-browser__options">
                  {shown.map((tag) => (
                    <FilterChoice
                      key={tag.id}
                      class="tavernary-companion-tag-browser__option"
                      label={tag.label}
                      count={tag.count}
                      checked={selected.includes(tag.id)}
                      title={tag.description}
                      onChange={() => onToggle(tag.id)}
                    />
                  ))}
                </div>
                {!normalizedSearch && (hiddenCount > 0 || expanded[facet]) ? (
                  <button
                    type="button"
                    class="tavernary-companion-filter-disclosure"
                    aria-expanded={expanded[facet]}
                    onClick={() =>
                      setExpanded((current) => ({ ...current, [facet]: !current[facet] }))
                    }
                  >
                    {expanded[facet] ? "Show fewer" : `Show ${hiddenCount} more`}
                  </button>
                ) : null}
              </fieldset>
            );
          })}
        </div>
        {normalizedSearch && visibleTags.length === 0 ? (
          <p class="tavernary-companion-tag-browser__empty">No matching goals or traits.</p>
        ) : null}
      </div>
    </section>
  );
}

function toggle(values: readonly string[], id: string): string[] {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}
