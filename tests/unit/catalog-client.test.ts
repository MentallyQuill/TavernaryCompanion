import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCatalogClient } from "../../src/catalog/catalog-client";
import { CATALOG_URL } from "../../src/catalog/catalog-transport";
import { createMemoryCatalogCache } from "../helpers/memory-catalog-cache";
import { cachedCatalogRecord, catalogBody, deferred } from "../helpers/catalog-fixtures";

async function seededCache(lastCheckedAt: string | null = null) {
  const cache = createMemoryCatalogCache();
  const record = cachedCatalogRecord();
  await cache.stage(record);
  await cache.activate(record.id);
  if (lastCheckedAt) await cache.recordCheck(lastCheckedAt);
  return cache;
}

function response(body: string | null, init: ResponseInit = {}) {
  return new Response(body, {
    ...init,
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

describe("CatalogClient", () => {
  let now: string;

  beforeEach(() => {
    now = "2026-08-18T01:00:00.000Z";
  });

  it("publishes compatible cache before conditional refresh resolves", async () => {
    const request = deferred<Response>();
    const cache = await seededCache();
    const fetch = vi.fn(() => request.promise);
    const client = createCatalogClient({ cache, fetch, now: () => now });

    const opening = client.open();
    await vi.waitFor(() => expect(client.read().state).toBe("ready-stale"));
    expect(fetch).toHaveBeenCalledWith(
      CATALOG_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ "If-None-Match": '"cached"' }),
      }),
    );

    request.resolve(response(null, { status: 304, headers: { ETag: '"cached"' } }));
    await opening;
    expect(client.read()).toMatchObject({ state: "ready-current", canMutate: true });
    await expect(cache.readMetadata()).resolves.toMatchObject({
      lastCheckedAt: now,
    });
  });

  it("rejects a cached body whose stored digest does not match", async () => {
    const cache = createMemoryCatalogCache();
    const record = cachedCatalogRecord({ bodySha256: "0".repeat(64) });
    await cache.stage(record);
    await cache.activate(record.id);
    const client = createCatalogClient({
      cache,
      fetch: vi.fn().mockRejectedValue(new Error("offline")),
      now: () => now,
    });

    await client.open();

    expect(client.read()).toMatchObject({ state: "error-empty", canMutate: false });
  });

  it("stages and activates a changed valid response", async () => {
    const cache = await seededCache();
    const body = catalogBody();
    const client = createCatalogClient({
      cache,
      fetch: vi.fn().mockResolvedValue(response(body, { headers: { ETag: '"next"' } })),
      now: () => now,
      sha256: vi.fn().mockResolvedValue("b".repeat(64)),
    });

    await client.open();

    expect(client.read()).toMatchObject({ state: "ready-current" });
    await expect(cache.readActive()).resolves.toMatchObject({
      etag: '"next"',
      bodySha256: "b".repeat(64),
      body,
    });
  });

  it.each([
    ["malformed JSON", "{ nope", "ready-offline"],
    ["wrong content type", catalogBody(), "ready-offline"],
  ])("keeps compatible cache for %s", async (_name, body, expectedState) => {
    const cache = await seededCache();
    const client = createCatalogClient({
      cache,
      fetch: vi
        .fn()
        .mockResolvedValue(
          _name === "wrong content type"
            ? new Response(body, { headers: { "Content-Type": "text/plain" } })
            : response(body),
        ),
      now: () => now,
    });

    await client.open();

    expect(client.read().state).toBe(expectedState);
    await expect(cache.readActive()).resolves.toMatchObject({ id: "cached" });
  });

  it("locks mutation on schema 8 while preserving cached browsing", async () => {
    const cache = await seededCache();
    const client = createCatalogClient({
      cache,
      fetch: vi.fn().mockResolvedValue(response(catalogBody(8))),
      now: () => now,
    });

    await client.open();

    expect(client.read()).toMatchObject({
      state: "incompatible-with-cache",
      remoteSchemaVersion: 8,
      canMutate: false,
      catalog: expect.any(Object),
    });
    await expect(cache.readActive()).resolves.toMatchObject({ id: "cached" });
  });

  it("reports incompatible and network failures without a cache", async () => {
    const incompatible = createCatalogClient({
      cache: createMemoryCatalogCache(),
      fetch: vi.fn().mockResolvedValue(response(catalogBody(8))),
      now: () => now,
    });
    await incompatible.open();
    expect(incompatible.read()).toMatchObject({
      state: "incompatible-empty",
      remoteSchemaVersion: 8,
      canMutate: false,
    });

    const failed = createCatalogClient({
      cache: createMemoryCatalogCache(),
      fetch: vi.fn().mockRejectedValue(new Error("offline")),
      now: () => now,
    });
    await failed.open();
    expect(failed.read()).toMatchObject({ state: "error-empty", canMutate: false });
  });

  it("throttles open checks for 15 minutes but allows forced refresh", async () => {
    const cache = await seededCache("2026-08-18T00:50:00.000Z");
    const fetch = vi.fn().mockResolvedValue(response(null, { status: 304 }));
    const client = createCatalogClient({ cache, fetch, now: () => now });

    await client.open();
    expect(fetch).not.toHaveBeenCalled();
    expect(client.read().state).toBe("ready-current");

    await client.refresh({ force: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rechecks on focus only after one hour", async () => {
    const cache = await seededCache("2026-08-18T00:50:00.000Z");
    const fetch = vi.fn().mockResolvedValue(response(null, { status: 304 }));
    const client = createCatalogClient({ cache, fetch, now: () => now });
    await client.open();

    now = "2026-08-18T01:49:00.000Z";
    await client.onFocus();
    expect(fetch).not.toHaveBeenCalled();
    now = "2026-08-18T01:51:00.000Z";
    await client.onFocus();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
