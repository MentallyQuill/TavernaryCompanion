export const CATALOG_URL = "https://tavernary.org/catalog/tavernary-catalog.json" as const;

export type CatalogFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function fetchCatalog(
  fetchImpl: CatalogFetch,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Response> {
  return fetchImpl(CATALOG_URL, {
    method: "GET",
    cache: "no-cache",
    credentials: "omit",
    headers: {
      Accept: "application/json",
    },
    signal,
  });
}
