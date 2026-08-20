import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { KitDiscoveryController } from "../../kits/kit-discovery-controller";
import type { KitCardViewModel, KitPrimaryAction } from "../../kits/kit-view-model";
import { KitCard } from "./kit-card";
import { KitFilterPanel } from "./kit-filter-panel";
import { KitSwitcher } from "./kit-switcher";

export function KitsRoute({
  controller,
  lifecycleDisabled = false,
  onOpenKit,
  onAction,
  switcherKits = [],
  activeKitId = null,
  onActivate,
  onDeactivate,
}: {
  controller: KitDiscoveryController;
  lifecycleDisabled?: boolean;
  onOpenKit(id: string): void;
  onAction(id: string, action: KitPrimaryAction): void;
  onNewKit?(): void;
  onImport?(): void;
  switcherKits?: readonly KitCardViewModel[];
  activeKitId?: string | null;
  onActivate?(id: string): void;
  onDeactivate?(): void;
}): preact.JSX.Element {
  const [state, setState] = useState(controller.read());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => controller.subscribe(setState), [controller]);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
    filterTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeFilters();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeFilters, filtersOpen]);

  const kitResults = (kits: readonly KitCardViewModel[]) =>
    kits.length ? (
      <div class="tavernary-companion-kit-grid">
        {kits.map((kit) => (
          <KitCard
            key={`${kit.origin}-${kit.id}`}
            kit={kit}
            disabled={lifecycleDisabled}
            onOpen={() => onOpenKit(kit.id)}
            onAction={(action) => onAction(kit.id, action)}
          />
        ))}
      </div>
    ) : (
      <p>No Kits match the current view.</p>
    );

  return (
    <section class="tavernary-companion-kits-route" aria-labelledby="kits-heading">
      <h2 id="kits-heading" class="tavernary-companion-sr-only">
        Kits
      </h2>
      <header class="tavernary-companion-route-toolbar">
        <strong aria-hidden="true">Kits</strong>
        <span>
          {state.visible.length} {state.visible.length === 1 ? "Kit" : "Kits"} shown
        </span>
      </header>
      {switcherKits.some(
        ({ operationalStatus }) =>
          operationalStatus === "Installed" || operationalStatus === "Active",
      ) ? (
        <KitSwitcher
          kits={switcherKits}
          activeKitId={activeKitId}
          disabled={lifecycleDisabled}
          onActivate={(id) => onActivate?.(id)}
          onDeactivate={onDeactivate}
        />
      ) : null}
      <div class="tavernary-companion-kit-segments" role="tablist" aria-label="Kit sources">
        <button
          type="button"
          role="tab"
          aria-selected={state.segment === "personal"}
          onClick={() => {
            setFiltersOpen(false);
            controller.setSegment("personal");
          }}
        >
          Personal <span>{state.personalCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.segment === "published"}
          onClick={() => controller.setSegment("published")}
        >
          Published <span>{state.publishedCount}</span>
        </button>
      </div>
      <label class="tavernary-companion-kit-search">
        <span class="tavernary-companion-sr-only">Search Kits</span>
        <input
          type="search"
          aria-label="Search Kits"
          placeholder="Search Kits…"
          value={state.search}
          onInput={(event) => controller.setSearch(event.currentTarget.value)}
        />
      </label>
      {state.segment === "published" ? (
        <>
          <button
            ref={filterTriggerRef}
            type="button"
            class="tavernary-companion-kit-filter-trigger"
            aria-label="Kit filters"
            aria-controls="tavernary-companion-kit-filters"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            Filters
          </button>
          <div class="tavernary-companion-published-kit-workspace">
            <KitFilterPanel
              query={state.query}
              facets={state.facets}
              open={filtersOpen}
              onClose={closeFilters}
              onChange={(query) => controller.setQuery(query)}
            />
            <div class="tavernary-companion-published-kit-results">
              <label class="tavernary-companion-kit-sort">
                <span>Sort</span>
                <select
                  value={state.query.sort}
                  aria-label="Sort Published Kits"
                  onChange={(event) =>
                    controller.setQuery({
                      ...state.query,
                      sort: event.currentTarget.value as typeof state.query.sort,
                    })
                  }
                >
                  <option value="trending">Trending</option>
                  <option value="newest">Newest</option>
                  <option value="updated">Recently updated</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="relevance">Relevance</option>
                </select>
              </label>
              {kitResults(state.visible)}
            </div>
          </div>
        </>
      ) : (
        kitResults(state.visible)
      )}
    </section>
  );
}
