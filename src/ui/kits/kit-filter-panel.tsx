import { useEffect, useRef } from "preact/hooks";

import { DEFAULT_KIT_QUERY, type KitQuery } from "../../catalog/catalog-core";
import type { KitDiscoveryFacets } from "../../kits/kit-discovery-controller";
import { FilterGroup } from "../projects/filter-controls";
import { DualRange } from "./dual-range";

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
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const update = (change: Partial<KitQuery>) => onChange({ ...query, ...change });
  const toggle = (values: readonly string[], id: string) =>
    values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const background = panel
      .closest(".tavernary-companion-kits-route")
      ?.querySelectorAll<HTMLElement>(
        ".tavernary-companion-route-toolbar, .tavernary-companion-kit-switcher, .tavernary-companion-kit-segments, .tavernary-companion-kit-search, .tavernary-companion-published-kit-results",
      );
    const previous = [...(background ?? [])].map((element) => ({
      element,
      inert: element.hasAttribute("inert"),
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    for (const { element } of previous) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }
    headingRef.current?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", trapFocus);
    return () => {
      panel.removeEventListener("keydown", trapFocus);
      for (const item of previous) {
        if (!item.inert) item.element.removeAttribute("inert");
        if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden");
        else item.element.setAttribute("aria-hidden", item.ariaHidden);
      }
    };
  }, [open]);
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
        ref={panelRef}
        id="tavernary-companion-kit-filters"
        class={`tavernary-companion-kit-filter-panel${open ? " is-open" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label="Kit filters"
      >
        <header>
          <h3 ref={headingRef} tabIndex={open ? -1 : undefined}>
            Filters
          </h3>
          <button
            type="button"
            onClick={() => onChange({ ...structuredClone(DEFAULT_KIT_QUERY), sort: query.sort })}
          >
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
          onToggle={(id) => update({ includesProjectId: id })}
          searchLabel="Search included projects"
          initialVisibleCount={5}
          countNoun="Kit"
          selectionMode="single"
        />
        <DualRange
          label="Kit size"
          minimumLabel="Minimum projects"
          maximumLabel="Maximum projects"
          min={3}
          max={50}
          value={[query.minProjects, query.maxProjects]}
          onChange={([minProjects, maxProjects]) => update({ minProjects, maxProjects })}
        />
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
