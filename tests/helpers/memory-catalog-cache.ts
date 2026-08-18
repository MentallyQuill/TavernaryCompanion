import type {
  CatalogCache,
  CatalogCacheMetadata,
  CatalogCacheRecord,
} from "../../src/catalog/catalog-cache";

export class MemoryCatalogCache implements CatalogCache {
  readonly records = new Map<string, CatalogCacheRecord>();
  metadata: CatalogCacheMetadata = {
    activeCatalogRecordId: null,
    lastCheckedAt: null,
    corruption: null,
  };
  failActivateForIds = new Set<string>();

  async readActive(): Promise<CatalogCacheRecord | null> {
    const id = this.metadata.activeCatalogRecordId;
    if (!id) return null;
    const record = this.records.get(id);
    if (!record) {
      this.metadata = {
        ...this.metadata,
        corruption: "missing-active-record",
      };
      return null;
    }
    return structuredClone(record);
  }

  async stage(record: CatalogCacheRecord): Promise<void> {
    this.records.set(record.id, structuredClone(record));
  }

  async activate(id: string): Promise<void> {
    if (this.failActivateForIds.has(id)) throw new Error("activate failed");
    if (!this.records.has(id)) throw new Error("staged record is missing");
    const previousId = this.metadata.activeCatalogRecordId;
    this.metadata = {
      ...this.metadata,
      activeCatalogRecordId: id,
      corruption: null,
    };
    const keep = new Set([id, ...(previousId ? [previousId] : [])]);
    for (const key of this.records.keys()) {
      if (!keep.has(key)) this.records.delete(key);
    }
  }

  async recordCheck(lastCheckedAt: string): Promise<void> {
    this.metadata = { ...this.metadata, lastCheckedAt };
  }

  async readMetadata(): Promise<CatalogCacheMetadata> {
    return structuredClone(this.metadata);
  }
}

export function createMemoryCatalogCache() {
  return new MemoryCatalogCache();
}
