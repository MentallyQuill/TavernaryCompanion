import type { CatalogSnapshot } from "../../catalog/catalog-client";
import { CatalogFreshness } from "../catalog/catalog-freshness";

interface ShellHeaderProps {
  search?: {
    value: string;
    onChange(value: string): void;
  };
  onRequestClose?: () => void;
  catalogSnapshot?: CatalogSnapshot;
  catalogRefreshing?: boolean;
  onRefreshCatalog?: () => void;
}

export function ShellHeader({
  search,
  onRequestClose,
  catalogSnapshot,
  catalogRefreshing,
  onRefreshCatalog,
}: ShellHeaderProps): preact.JSX.Element {
  return (
    <header class="tavernary-companion-shell__header">
      <div class="tavernary-companion-brand">
        <span class="tavernary-companion-brand__mark" role="img" aria-label="Tavernary" />
        <div class="tavernary-companion-brand__copy">
          <h1 id="tavernary-companion-heading" aria-label="Tavernary Companion">
            <span class="tavernary-companion-brand__name">Tavernary</span>
            <span class="tavernary-companion-brand__companion">Companion</span>
          </h1>
        </div>
      </div>
      {search ? (
        <label class="tavernary-companion-header-search">
          <span class="tavernary-companion-sr-only">Search projects</span>
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects or creators…"
            value={search.value}
            onInput={(event) => search.onChange(event.currentTarget.value)}
          />
        </label>
      ) : null}
      <div class="tavernary-companion-shell__utilities">
        {catalogSnapshot ? (
          <>
            <CatalogFreshness snapshot={catalogSnapshot} refreshing={catalogRefreshing} />
            {onRefreshCatalog ? (
              <button
                class="tavernary-companion-button tavernary-companion-button--primary"
                type="button"
                onClick={onRefreshCatalog}
                aria-label="Refresh catalog"
              >
                Refresh
              </button>
            ) : null}
          </>
        ) : null}
        {onRequestClose ? (
          <button
            class="tavernary-companion-button tavernary-companion-button--secondary"
            type="button"
            onClick={onRequestClose}
            aria-label="Close Tavernary Companion"
          >
            Close
          </button>
        ) : null}
      </div>
    </header>
  );
}
