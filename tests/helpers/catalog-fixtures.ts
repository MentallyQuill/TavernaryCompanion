import type { CatalogV7 } from "../../src/catalog/catalog-core";
import type { CatalogCacheRecord } from "../../src/catalog/catalog-cache";

export function catalogFixture(generatedAt = "2026-08-18T00:00:00.000Z"): CatalogV7 {
  return {
    schemaVersion: 7,
    generatedAt,
    tagVocabulary: [],
    projects: [],
    kits: [],
  };
}

export function catalogBody(schemaVersion = 7): string {
  return JSON.stringify({
    ...catalogFixture(),
    schemaVersion,
  });
}

export function cachedCatalogRecord(
  overrides: Partial<CatalogCacheRecord> = {},
): CatalogCacheRecord {
  return {
    id: "cached",
    schemaVersion: 7,
    generatedAt: "2026-08-18T00:00:00.000Z",
    etag: '"cached"',
    fetchedAt: "2026-08-18T00:05:00.000Z",
    bodySha256: "a".repeat(64),
    body: catalogBody(),
    ...overrides,
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
