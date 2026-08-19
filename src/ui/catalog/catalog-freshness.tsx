import type { CatalogSnapshot } from "../../catalog/catalog-client";

interface CatalogFreshnessProps {
  snapshot: CatalogSnapshot;
  now?: string;
  refreshing?: boolean;
}

export function CatalogFreshness({
  snapshot,
  now = new Date().toISOString(),
  refreshing = false,
}: CatalogFreshnessProps): preact.JSX.Element {
  const label = refreshing ? "Checking catalog…" : freshnessLabel(snapshot);
  const title =
    "catalog" in snapshot
      ? `Catalog published ${relativeAge(snapshot.catalog.generatedAt, now)}`
      : undefined;
  return (
    <span class="tavernary-companion-catalog-freshness" data-state={snapshot.state} title={title}>
      {label}
    </span>
  );
}

function freshnessLabel(snapshot: CatalogSnapshot): string {
  switch (snapshot.state) {
    case "empty-loading":
      return "Checking catalog…";
    case "ready-current":
      return "Catalog up to date";
    case "ready-stale":
      return "Catalog may be old";
    case "ready-offline":
      return "Cached · offline";
    case "incompatible-with-cache":
    case "incompatible-empty":
      return "Update required";
    case "error-empty":
      return "Catalog unavailable";
  }
}

function relativeAge(value: string, now: string): string {
  const elapsed = Math.max(0, Date.parse(now) - Date.parse(value));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
