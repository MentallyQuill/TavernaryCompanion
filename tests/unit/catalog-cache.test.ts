import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import type { CatalogCache, CatalogCacheRecord } from "../../src/catalog/catalog-cache";
import { createIndexedDbCatalogCache } from "../../src/catalog/indexeddb-catalog-cache";
import { createMemoryCatalogCache } from "../helpers/memory-catalog-cache";

function record(id: string, fetchedAt: string): CatalogCacheRecord {
  return {
    id,
    schemaVersion: 7,
    generatedAt: "2026-08-18T00:00:00.000Z",
    etag: `"${id}"`,
    fetchedAt,
    bodySha256: id.padEnd(64, "0"),
    body: JSON.stringify({ schemaVersion: 7, id }),
  };
}

async function cacheContract(cache: CatalogCache) {
  const first = record("first", "2026-08-18T00:00:00.000Z");
  const second = record("second", "2026-08-18T01:00:00.000Z");
  const third = record("third", "2026-08-18T02:00:00.000Z");

  await expect(cache.readActive()).resolves.toBeNull();
  await cache.stage(first);
  await cache.activate(first.id);
  await expect(cache.readActive()).resolves.toEqual(first);

  await cache.stage(second);
  await expect(cache.readActive()).resolves.toEqual(first);
  await cache.activate(second.id);
  await expect(cache.readActive()).resolves.toEqual(second);

  await cache.stage(third);
  await cache.activate(third.id);
  await expect(cache.readActive()).resolves.toEqual(third);
  await expect(cache.activate("missing")).rejects.toThrow("staged record is missing");
  await expect(cache.readActive()).resolves.toEqual(third);

  await cache.recordCheck("2026-08-18T03:00:00.000Z");
  await expect(cache.readMetadata()).resolves.toMatchObject({
    activeCatalogRecordId: "third",
    lastCheckedAt: "2026-08-18T03:00:00.000Z",
    corruption: null,
  });
}

describe("CatalogCache", () => {
  it("implements the atomic contract in memory", async () => {
    await cacheContract(createMemoryCatalogCache());
  });

  it("implements the atomic contract in IndexedDB", async () => {
    await cacheContract(
      createIndexedDbCatalogCache({
        databaseName: `tavernary-companion-test-${crypto.randomUUID()}`,
      }),
    );
  });

  it("keeps the old active record when activation is interrupted", async () => {
    const cache = createMemoryCatalogCache();
    const first = record("first", "2026-08-18T00:00:00.000Z");
    const second = record("second", "2026-08-18T01:00:00.000Z");
    await cache.stage(first);
    await cache.activate(first.id);
    await cache.stage(second);
    cache.failActivateForIds.add(second.id);

    await expect(cache.activate(second.id)).rejects.toThrow("activate failed");
    await expect(cache.readActive()).resolves.toEqual(first);
  });

  it("prunes memory records to the active and previous slots", async () => {
    const cache = createMemoryCatalogCache();
    for (const [id, hour] of [
      ["first", "00"],
      ["second", "01"],
      ["third", "02"],
    ] as const) {
      await cache.stage(record(id, `2026-08-18T${hour}:00:00.000Z`));
      await cache.activate(id);
    }

    expect([...cache.records.keys()].sort()).toEqual(["second", "third"]);
  });

  it("reports a recoverable dangling active pointer", async () => {
    const cache = createMemoryCatalogCache();
    cache.metadata.activeCatalogRecordId = "missing";

    await expect(cache.readActive()).resolves.toBeNull();
    await expect(cache.readMetadata()).resolves.toMatchObject({
      corruption: "missing-active-record",
    });
  });
});
