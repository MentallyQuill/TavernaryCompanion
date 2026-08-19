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
      <a
        class="tavernary-companion-brand"
        href="https://tavernary.org/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Tavernary Companion — open Tavernary.org in a new tab"
      >
        <span class="tavernary-companion-brand__mark" role="img" aria-label="Tavernary" />
        <div class="tavernary-companion-brand__copy">
          <h1 id="tavernary-companion-heading" aria-label="Tavernary Companion">
            <span class="tavernary-companion-brand__name">Tavernary</span>
            <span class="tavernary-companion-brand__companion">Companion</span>
          </h1>
        </div>
      </a>
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
                class={`tavernary-companion-button tavernary-companion-button--primary tavernary-companion-refresh${catalogRefreshing ? " is-refreshing" : ""}`}
                type="button"
                onClick={onRefreshCatalog}
                aria-label={catalogRefreshing ? "Refreshing catalog" : "Refresh catalog"}
                aria-busy={catalogRefreshing ? "true" : "false"}
                disabled={catalogRefreshing}
              >
                <svg data-refresh-icon="true" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21 3V8M21 8H16M21 8L18 5.29168C16.4077 3.86656 14.3051 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.2832 21 19.8675 18.008 20.777 14"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{catalogRefreshing ? "Refreshing" : "Refresh"}</span>
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
