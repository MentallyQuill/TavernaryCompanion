import { DEFAULT_KIT_QUERY, type KitQuery } from "../../catalog/catalog-core";
import type { KitDiscoveryFacets } from "../../kits/kit-discovery-controller";
import { FilterGroup } from "../projects/filter-controls";

export function KitFilterPanel({
  query,
  facets,
  open = false,
  onChange,
  onClose,
}: {
  query: KitQuery;
  facets: KitDiscoveryFacets;
  open?: boolean;
  onChange(query: KitQuery): void;
  onClose?(): void;
}): preact.JSX.Element {
  const update = (change: Partial<KitQuery>) => onChange({ ...query, ...change });
  const toggle = (values: readonly string[], id: string) =>
    values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
  return (
    <>
      {open ? (
        <button
          type="button"
          class="tavernary-companion-kit-filter-backdrop"
          aria-label="Close Kit filters"
          onClick={onClose}
        />
      ) : null}
      <aside
        id="tavernary-companion-kit-filters"
        class={`tavernary-companion-kit-filter-panel${open ? " is-open" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label="Kit filters"
      >
        <header>
          <h3>Filters</h3>
          <button type="button" onClick={() => onChange(structuredClone(DEFAULT_KIT_QUERY))}>
            Clear all
          </button>
          <button
            type="button"
            class="tavernary-companion-kit-filter-close"
            aria-label="Close Kit filters"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <FilterGroup
          title="Compatible frontend"
          options={facets.frontends}
          selected={query.frontends}
          onToggle={(id) => update({ frontends: toggle(query.frontends, id) })}
          searchLabel="Search compatible frontends"
          initialVisibleCount={3}
          countNoun="Kit"
        />
        <FilterGroup
          title="Purpose"
          options={facets.purposes}
          selected={query.purposes}
          onToggle={(id) => update({ purposes: toggle(query.purposes, id) })}
          presentation="chips"
          countNoun="Kit"
        />
        <FilterGroup
          title="Model family"
          options={facets.modelFamilies}
          selected={query.modelFamilies ?? []}
          onToggle={(id) => update({ modelFamilies: toggle(query.modelFamilies ?? [], id) })}
          presentation="chips"
          countNoun="Kit"
        />
        <FilterGroup
          title="Includes project"
          options={facets.projects}
          selected={query.includesProjectId ? [query.includesProjectId] : []}
          onToggle={(id) => update({ includesProjectId: query.includesProjectId === id ? "" : id })}
          searchLabel="Search included projects"
          initialVisibleCount={5}
          countNoun="Kit"
        />
        <fieldset class="tavernary-companion-kit-size-filter">
          <legend>Kit size</legend>
          <label>
            <span>Minimum projects</span>
            <input
              type="range"
              min="3"
              max="50"
              value={query.minProjects}
              aria-label="Minimum projects"
              onInput={(event) =>
                update({
                  minProjects: Math.min(event.currentTarget.valueAsNumber, query.maxProjects),
                })
              }
            />
          </label>
          <label>
            <span>Maximum projects</span>
            <input
              type="range"
              min="3"
              max="50"
              value={query.maxProjects}
              aria-label="Maximum projects"
              onInput={(event) =>
                update({
                  maxProjects: Math.max(event.currentTarget.valueAsNumber, query.minProjects),
                })
              }
            />
          </label>
          <output>
            {query.minProjects}–{query.maxProjects} projects
          </output>
        </fieldset>
        <fieldset class="tavernary-companion-kit-status-filter">
          <legend>Kit status</legend>
          <label class="tavernary-companion-filter-option">
            <input
              type="checkbox"
              checked={query.allComponentsAvailable}
              aria-label="All components available"
              onChange={(event) => update({ allComponentsAvailable: event.currentTarget.checked })}
            />
            <span>All components available</span>
            <b aria-label={`${facets.availableCount} Kits`}>{facets.availableCount}</b>
          </label>
        </fieldset>
      </aside>
    </>
  );
}
