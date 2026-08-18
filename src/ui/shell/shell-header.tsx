import type { CatalogSnapshot } from "../../catalog/catalog-client";
import { CatalogFreshness } from "../catalog/catalog-freshness";

interface ShellHeaderProps {
  onRequestClose?: () => void;
  catalogSnapshot?: CatalogSnapshot;
  catalogRefreshing?: boolean;
  onRefreshCatalog?: () => void;
}

export function ShellHeader({
  onRequestClose,
  catalogSnapshot,
  catalogRefreshing,
  onRefreshCatalog,
}: ShellHeaderProps): preact.JSX.Element {
  return (
    <header class="tavernary-companion-shell__header">
      <div>
        <span class="tavernary-companion-shell__eyebrow">Tavernary</span>
        <h1 id="tavernary-companion-heading">Tavernary Companion</h1>
      </div>
      <div class="tavernary-companion-shell__utilities">
        {catalogSnapshot ? (
          <>
            <CatalogFreshness snapshot={catalogSnapshot} refreshing={catalogRefreshing} />
            {onRefreshCatalog ? (
              <button type="button" onClick={onRefreshCatalog} aria-label="Refresh catalog">
                Refresh
              </button>
            ) : null}
          </>
        ) : null}
        {onRequestClose ? (
          <button type="button" onClick={onRequestClose} aria-label="Close Tavernary Companion">
            Close
          </button>
        ) : null}
      </div>
    </header>
  );
}
