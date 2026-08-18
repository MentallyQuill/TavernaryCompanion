import type { CatalogCache, CatalogCacheRecord } from "./catalog-cache";
import { CatalogClientError } from "./catalog-errors";
import { parseCatalogV7, SUPPORTED_CATALOG_SCHEMA, type CatalogV7 } from "./catalog-core";
import { fetchCatalog, type CatalogFetch } from "./catalog-transport";

const OPEN_THROTTLE_MS = 15 * 60 * 1000;
const FOCUS_RECHECK_MS = 60 * 60 * 1000;

interface SnapshotBase {
  canMutate: boolean;
  checkedAt: string | null;
}

export type CatalogSnapshot =
  | (SnapshotBase & { state: "empty-loading"; canMutate: false })
  | (SnapshotBase & {
      state: "ready-current" | "ready-stale";
      canMutate: true;
      catalog: CatalogV7;
    })
  | (SnapshotBase & {
      state: "ready-offline";
      canMutate: true;
      catalog: CatalogV7;
      error: string;
    })
  | (SnapshotBase & {
      state: "incompatible-with-cache";
      canMutate: false;
      catalog: CatalogV7;
      remoteSchemaVersion: number;
    })
  | (SnapshotBase & {
      state: "incompatible-empty";
      canMutate: false;
      remoteSchemaVersion: number;
    })
  | (SnapshotBase & {
      state: "error-empty";
      canMutate: false;
      error: string;
    });

export interface CatalogClient {
  open(): Promise<void>;
  refresh(options?: { force?: boolean }): Promise<void>;
  onFocus(): Promise<void>;
  read(): CatalogSnapshot;
  subscribe(listener: (snapshot: CatalogSnapshot) => void): () => void;
}

interface CatalogClientOptions {
  cache: CatalogCache;
  fetch?: CatalogFetch;
  now?: () => string;
  sha256?: (body: string) => Promise<string>;
}

function elapsed(now: string, previous: string | null) {
  if (!previous) return Number.POSITIVE_INFINITY;
  const milliseconds = Date.parse(now) - Date.parse(previous);
  return Number.isFinite(milliseconds) && milliseconds >= 0
    ? milliseconds
    : Number.POSITIVE_INFINITY;
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "Catalog refresh failed.";
}

async function webSha256(body: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

class DefaultCatalogClient implements CatalogClient {
  readonly #cache: CatalogCache;
  readonly #fetch: CatalogFetch;
  readonly #now: () => string;
  readonly #sha256: (body: string) => Promise<string>;
  readonly #listeners = new Set<(snapshot: CatalogSnapshot) => void>();
  #snapshot: CatalogSnapshot = {
    state: "empty-loading",
    canMutate: false,
    checkedAt: null,
  };
  #catalog: CatalogV7 | null = null;
  #activeRecord: CatalogCacheRecord | null = null;
  #lastCheckedAt: string | null = null;
  #opened = false;
  #opening: Promise<void> | null = null;
  #refreshing: Promise<void> | null = null;

  constructor(options: CatalogClientOptions) {
    this.#cache = options.cache;
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#sha256 = options.sha256 ?? webSha256;
  }

  open(): Promise<void> {
    if (this.#opening) return this.#opening;
    this.#opening = this.#open();
    return this.#opening;
  }

  async #open() {
    if (this.#opened) return;
    this.#opened = true;
    const [activeRecord, metadata] = await Promise.all([
      this.#cache.readActive(),
      this.#cache.readMetadata(),
    ]);
    this.#lastCheckedAt = metadata.lastCheckedAt;
    if (activeRecord) {
      try {
        this.#catalog = parseCatalogV7(JSON.parse(activeRecord.body));
        this.#activeRecord = activeRecord;
        this.#publish({
          state: "ready-stale",
          canMutate: true,
          checkedAt: this.#lastCheckedAt,
          catalog: this.#catalog,
        });
      } catch {
        this.#catalog = null;
        this.#activeRecord = null;
      }
    }

    const now = this.#now();
    if (this.#catalog && elapsed(now, this.#lastCheckedAt) < OPEN_THROTTLE_MS) {
      this.#publish({
        state: "ready-current",
        canMutate: true,
        checkedAt: this.#lastCheckedAt,
        catalog: this.#catalog,
      });
      return;
    }
    await this.refresh();
  }

  async refresh({ force = false }: { force?: boolean } = {}) {
    if (this.#refreshing) return this.#refreshing;
    const now = this.#now();
    if (!force && elapsed(now, this.#lastCheckedAt) < OPEN_THROTTLE_MS) {
      return;
    }
    this.#refreshing = this.#performRefresh(now).finally(() => {
      this.#refreshing = null;
    });
    return this.#refreshing;
  }

  async onFocus() {
    const now = this.#now();
    if (elapsed(now, this.#lastCheckedAt) < FOCUS_RECHECK_MS) return;
    await this.refresh({ force: true });
  }

  read() {
    return this.#snapshot;
  }

  subscribe(listener: (snapshot: CatalogSnapshot) => void) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async #performRefresh(checkedAt: string) {
    try {
      const response = await fetchCatalog(this.#fetch, {
        etag: this.#activeRecord?.etag ?? null,
      });
      if (response.status === 304) {
        if (!this.#catalog) {
          throw new CatalogClientError("http", "Catalog returned 304 without a compatible cache.");
        }
        await this.#recordChecked(checkedAt);
        this.#publish({
          state: "ready-current",
          canMutate: true,
          checkedAt,
          catalog: this.#catalog,
        });
        return;
      }
      if (!response.ok) {
        throw new CatalogClientError(
          "http",
          `Catalog request failed with status ${response.status}.`,
        );
      }
      const contentType = response.headers.get("Content-Type") ?? "";
      if (!/(?:^|\s|;)application\/(?:[a-z0-9.-]+\+)?json(?:\s|;|$)/iu.test(contentType)) {
        throw new CatalogClientError("content-type", "Catalog response is not JSON.");
      }
      const body = await response.text();
      let value: unknown;
      try {
        value = JSON.parse(body);
      } catch (cause) {
        throw new CatalogClientError("invalid-json", "Catalog JSON is malformed.", {
          cause,
        });
      }
      const remoteSchemaVersion =
        typeof value === "object" &&
        value !== null &&
        "schemaVersion" in value &&
        Number.isInteger(value.schemaVersion)
          ? (value.schemaVersion as number)
          : null;
      if (remoteSchemaVersion !== SUPPORTED_CATALOG_SCHEMA) {
        if (remoteSchemaVersion === null) {
          throw new CatalogClientError("invalid-catalog", "Catalog schema version is missing.");
        }
        await this.#recordChecked(checkedAt);
        this.#publish(
          this.#catalog
            ? {
                state: "incompatible-with-cache",
                canMutate: false,
                checkedAt,
                catalog: this.#catalog,
                remoteSchemaVersion,
              }
            : {
                state: "incompatible-empty",
                canMutate: false,
                checkedAt,
                remoteSchemaVersion,
              },
        );
        return;
      }

      let catalog: CatalogV7;
      try {
        catalog = parseCatalogV7(value);
      } catch (cause) {
        throw new CatalogClientError("invalid-catalog", "Catalog schema validation failed.", {
          cause,
        });
      }
      const bodySha256 = await this.#sha256(body);
      const record: CatalogCacheRecord = {
        id: `${catalog.generatedAt}:${bodySha256}`,
        schemaVersion: SUPPORTED_CATALOG_SCHEMA,
        generatedAt: catalog.generatedAt,
        etag: response.headers.get("ETag"),
        fetchedAt: checkedAt,
        bodySha256,
        body,
      };
      await this.#cache.stage(record);
      await this.#cache.activate(record.id);
      await this.#recordChecked(checkedAt);
      this.#activeRecord = record;
      this.#catalog = catalog;
      this.#publish({
        state: "ready-current",
        canMutate: true,
        checkedAt,
        catalog,
      });
    } catch (cause) {
      await this.#recordChecked(checkedAt).catch(() => undefined);
      if (this.#snapshot.state === "incompatible-with-cache") return;
      const message = errorMessage(cause);
      this.#publish(
        this.#catalog
          ? {
              state: "ready-offline",
              canMutate: true,
              checkedAt,
              catalog: this.#catalog,
              error: message,
            }
          : {
              state: "error-empty",
              canMutate: false,
              checkedAt,
              error: message,
            },
      );
    }
  }

  async #recordChecked(checkedAt: string) {
    await this.#cache.recordCheck(checkedAt);
    this.#lastCheckedAt = checkedAt;
  }

  #publish(snapshot: CatalogSnapshot) {
    this.#snapshot = snapshot;
    for (const listener of this.#listeners) listener(snapshot);
  }
}

export function createCatalogClient(options: CatalogClientOptions): CatalogClient {
  return new DefaultCatalogClient(options);
}
