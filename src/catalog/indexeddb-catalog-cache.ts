import type { CatalogCache, CatalogCacheMetadata, CatalogCacheRecord } from "./catalog-cache";

const DATABASE_NAME = "tavernary-companion";
const DATABASE_VERSION = 1;
const RECORDS_STORE = "catalog-records";
const META_STORE = "catalog-meta";
const ACTIVE_KEY = "activeCatalogRecordId";
const LAST_CHECKED_KEY = "lastCheckedAt";
const CORRUPTION_KEY = "corruption";

interface MetaRecord {
  key: string;
  value: string | null;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed.")),
      { once: true },
    );
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted.")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      { once: true },
    );
  });
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  const request = factory.open(name, DATABASE_VERSION);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(RECORDS_STORE)) {
      database.createObjectStore(RECORDS_STORE, { keyPath: "id" });
    }
    if (!database.objectStoreNames.contains(META_STORE)) {
      database.createObjectStore(META_STORE, { keyPath: "key" });
    }
  });
  return requestResult(request);
}

function putMeta(store: IDBObjectStore, key: string, value: string | null) {
  store.put({ key, value } satisfies MetaRecord);
}

async function readMetaValue(store: IDBObjectStore, key: string): Promise<string | null> {
  const record = (await requestResult(store.get(key))) as MetaRecord | undefined;
  return record?.value ?? null;
}

class IndexedDbCatalogCache implements CatalogCache {
  readonly #database: Promise<IDBDatabase>;

  constructor(factory: IDBFactory, databaseName: string) {
    this.#database = openDatabase(factory, databaseName);
  }

  async readActive(): Promise<CatalogCacheRecord | null> {
    const database = await this.#database;
    const transaction = database.transaction([RECORDS_STORE, META_STORE], "readonly");
    const id = await readMetaValue(transaction.objectStore(META_STORE), ACTIVE_KEY);
    const record = id
      ? ((await requestResult(transaction.objectStore(RECORDS_STORE).get(id))) as
          CatalogCacheRecord | undefined)
      : undefined;
    await transactionDone(transaction);
    if (!id) return null;
    if (!record) {
      await this.#writeMeta(CORRUPTION_KEY, "missing-active-record");
      return null;
    }
    return structuredClone(record);
  }

  async stage(record: CatalogCacheRecord): Promise<void> {
    const database = await this.#database;
    const transaction = database.transaction(RECORDS_STORE, "readwrite");
    transaction.objectStore(RECORDS_STORE).put(structuredClone(record));
    await transactionDone(transaction);
  }

  async activate(id: string): Promise<void> {
    const database = await this.#database;
    const transaction = database.transaction([RECORDS_STORE, META_STORE], "readwrite");
    const records = transaction.objectStore(RECORDS_STORE);
    const metadata = transaction.objectStore(META_STORE);
    const staged = (await requestResult(records.get(id))) as CatalogCacheRecord | undefined;
    if (!staged) {
      transaction.abort();
      await transactionDone(transaction).catch(() => undefined);
      throw new Error("staged record is missing");
    }
    const previousId = await readMetaValue(metadata, ACTIVE_KEY);
    putMeta(metadata, ACTIVE_KEY, id);
    putMeta(metadata, CORRUPTION_KEY, null);
    const keep = new Set([id, ...(previousId ? [previousId] : [])]);
    const keys = await requestResult(records.getAllKeys());
    for (const key of keys) {
      if (typeof key === "string" && !keep.has(key)) records.delete(key);
    }
    await transactionDone(transaction);
  }

  async recordCheck(lastCheckedAt: string): Promise<void> {
    await this.#writeMeta(LAST_CHECKED_KEY, lastCheckedAt);
  }

  async readMetadata(): Promise<CatalogCacheMetadata> {
    const database = await this.#database;
    const transaction = database.transaction(META_STORE, "readonly");
    const store = transaction.objectStore(META_STORE);
    const [activeCatalogRecordId, lastCheckedAt, corruption] = await Promise.all([
      readMetaValue(store, ACTIVE_KEY),
      readMetaValue(store, LAST_CHECKED_KEY),
      readMetaValue(store, CORRUPTION_KEY),
    ]);
    await transactionDone(transaction);
    return {
      activeCatalogRecordId,
      lastCheckedAt,
      corruption: corruption === "missing-active-record" ? corruption : null,
    };
  }

  async #writeMeta(key: string, value: string | null) {
    const database = await this.#database;
    const transaction = database.transaction(META_STORE, "readwrite");
    putMeta(transaction.objectStore(META_STORE), key, value);
    await transactionDone(transaction);
  }
}

export function createIndexedDbCatalogCache({
  indexedDb = globalThis.indexedDB,
  databaseName = DATABASE_NAME,
}: {
  indexedDb?: IDBFactory;
  databaseName?: string;
} = {}): CatalogCache {
  if (!indexedDb) throw new Error("IndexedDB is unavailable.");
  return new IndexedDbCatalogCache(indexedDb, databaseName);
}

export const CATALOG_CACHE_DATABASE_VERSION = DATABASE_VERSION;
