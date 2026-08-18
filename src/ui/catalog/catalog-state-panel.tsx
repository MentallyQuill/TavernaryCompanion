import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import type { CatalogSnapshot } from "../../catalog/catalog-client";
import { CatalogFreshness } from "./catalog-freshness";

interface CatalogStatePanelProps {
  snapshot: CatalogSnapshot;
  onRefresh(): void | Promise<void>;
  onUpdateCompanion(): void;
  onUseCached(): void;
  onOpenTavernary(): void;
  children?: ComponentChildren;
}

export function CatalogStatePanel({
  snapshot,
  onRefresh,
  onUpdateCompanion,
  onUseCached,
  onOpenTavernary,
  children,
}: CatalogStatePanelProps): preact.JSX.Element {
  const [refreshing, setRefreshing] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [usingCache, setUsingCache] = useState(false);
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setAnnouncement("");
    try {
      await onRefresh();
      setAnnouncement("Catalog is current");
    } finally {
      setRefreshing(false);
    }
  };
  const incompatible = snapshot.state.startsWith("incompatible");
  const emptyError = snapshot.state === "error-empty";
  return (
    <section
      class="tavernary-companion-catalog-state"
      data-testid="catalog-state-panel"
      data-lifecycle-disabled={String(!snapshot.canMutate)}
    >
      {emptyError ? (
        <header>
          <CatalogFreshness snapshot={snapshot} refreshing={refreshing} />
          <button type="button" onClick={() => void refresh()} disabled={refreshing}>
            Try again
          </button>
        </header>
      ) : null}
      <span class="tavernary-companion-sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {incompatible && !usingCache ? (
        <section aria-labelledby="catalog-update-heading">
          <h2 id="catalog-update-heading">Companion update required</h2>
          <p>
            Tavernary now publishes catalog schema{" "}
            {"remoteSchemaVersion" in snapshot ? snapshot.remoteSchemaVersion : "a newer version"}.
            Update Companion before refreshing or changing installed extensions.
          </p>
          <div>
            <button type="button" onClick={onUpdateCompanion}>
              Update Companion
            </button>
            {snapshot.state === "incompatible-with-cache" ? (
              <button
                type="button"
                onClick={() => {
                  setUsingCache(true);
                  onUseCached();
                }}
              >
                Use cached catalog
              </button>
            ) : null}
            <button type="button" onClick={onOpenTavernary}>
              Open Tavernary
            </button>
          </div>
        </section>
      ) : emptyError ? (
        <section aria-labelledby="catalog-error-heading">
          <h2 id="catalog-error-heading">Catalog unavailable</h2>
          <p>No saved catalog is available. Check the connection and try again.</p>
          <details>
            <summary>Error details</summary>
            <p>Unable to reach or validate the Tavernary catalog.</p>
          </details>
        </section>
      ) : snapshot.state === "empty-loading" ? (
        <div class="tavernary-companion-catalog-skeleton" aria-label="Loading catalog">
          <span />
          <span />
          <span />
        </div>
      ) : (
        children
      )}
    </section>
  );
}
