export const CATALOG_URL = "https://tavernary.org/catalog/tavernary-catalog.json" as const;

export type CatalogFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function fetchCatalog(
  fetchImpl: CatalogFetch,
  { etag, signal }: { etag: string | null; signal?: AbortSignal },
): Promise<Response> {
  return fetchImpl(CATALOG_URL, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      ...(etag ? { "If-None-Match": etag } : {}),
    },
    signal,
  });
}
