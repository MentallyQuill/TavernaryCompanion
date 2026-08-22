export interface CatalogCacheRecord {
  id: string;
  schemaVersion: 7 | 8;
  generatedAt: string;
  etag: string | null;
  fetchedAt: string;
  bodySha256: string;
  body: string;
}

export type CatalogCacheCorruption = "missing-active-record";

export interface CatalogCacheMetadata {
  activeCatalogRecordId: string | null;
  lastCheckedAt: string | null;
  corruption: CatalogCacheCorruption | null;
}

export interface CatalogCache {
  readActive(): Promise<CatalogCacheRecord | null>;
  stage(record: CatalogCacheRecord): Promise<void>;
  activate(id: string): Promise<void>;
  recordCheck(lastCheckedAt: string): Promise<void>;
  readMetadata(): Promise<CatalogCacheMetadata>;
}
