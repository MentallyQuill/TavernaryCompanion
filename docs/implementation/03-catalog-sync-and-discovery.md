# Catalog Sync and Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a trustworthy Tavernary catalog immediately from a last-known-good cache, refresh it atomically, and produce Tavernary-identical discovery results joined with authoritative SillyTavern inventory.

**Architecture:** `CatalogClient` coordinates transport, schema validation, and a two-slot IndexedDB cache. Vendored CatalogCore owns all catalog parsing, search, query, filter, and sort semantics. `InventoryReconciler` joins host-discovered extensions to validated install identities only after selection, keeping catalog ranking independent from local state.

**Tech Stack:** TypeScript, vendored `@tavernary/catalog-core`, IndexedDB, Vitest, fake-indexeddb, MiniSearch through CatalogCore.

**Spec:** `docs/superpowers/specs/2026-08-18-tavernary-companion-design.md`; `docs/design/03-catalog-discovery.md`; `docs/design/06-catalog-refresh-and-recovery.md`

## Global Constraints

- Fetch only `https://tavernary.org/catalog/tavernary-catalog.json`.
- Support exactly catalog schema 7 in V1.
- Never replace a compatible cache until the complete response parses and validates.
- Never download remote code or treat a remote JSON schema as executable compatibility.
- Default discovery selects frontend `sillytavern` and kinds `extension` plus `preset`.
- Users may clear defaults and browse the entire catalog.
- Host-installed state cannot change search ranking or Tavernary metadata.
- Companion's own project is always non-actionable.

---

### Task 1: Verify and expose the vendored CatalogCore

**Files:**
- Create: `scripts/sync-tavernary-core.mjs`
- Create: `vendor/tavernary-core.lock.json`
- Create through sync: `vendor/tavernary-core/`
- Create: `src/catalog/catalog-core.ts`
- Test: `tests/unit/vendor-lock.test.ts`
- Test: `tests/contract/catalog-core-fixtures.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: locked Tavernary `packages/catalog-core` source and fixtures.
- Produces: local imports of `CatalogV7`, `CatalogProject`, `CatalogQuery`, `parseCatalogV7`, `createCatalogSearchIndex`, `selectProjects`, and Kit selectors.

- [ ] **Step 1: Write failing lock and contract tests**

```ts
it("rejects any vendored byte not represented by the lock", async () => {
  const result = await verifyVendorLock({ root: process.cwd() });
  expect(result).toEqual({ ok: true });
});

it("passes every shared project selector fixture", () => {
  for (const fixture of projectSelectorFixtures) {
    expect(runProjectFixture(fixture)).toEqual(fixture.expectedProjectIds);
  }
});
```

- [ ] **Step 2: Run the tests and observe missing-vendor failures**

Run: `npm.cmd test -- tests/unit/vendor-lock.test.ts tests/contract/catalog-core-fixtures.test.ts`

Expected: FAIL until Phase 1's sync interface and locked package are present.

- [ ] **Step 3: Implement the deterministic sync command**

Read a clean local Tavernary worktree or a Git archive at an explicit commit. Copy only `packages/catalog-core`, reject symlinks and path traversal, hash every regular file with SHA-256, sort paths ordinally, and atomically replace the vendor directory and lock. Verification recalculates every hash and rejects missing or extra files.

- [ ] **Step 4: Add the package adapter**

`src/catalog/catalog-core.ts` re-exports the vendored package's public surface and defines only Companion constants:

```ts
export const SUPPORTED_CATALOG_SCHEMA = 7 as const;
export const DEFAULT_COMPANION_QUERY: CatalogQuery = {
  ...DEFAULT_QUERY,
  frontends: ["sillytavern"],
  kinds: ["extension", "preset"],
};
```

- [ ] **Step 5: Run contract tests and typecheck**

Run: `npm.cmd test -- tests/unit/vendor-lock.test.ts tests/contract/catalog-core-fixtures.test.ts`

Run: `npm.cmd run typecheck`

Expected: PASS with the same fixture count recorded by Tavernary.

- [ ] **Step 6: Commit**

```powershell
git add -- scripts/sync-tavernary-core.mjs vendor/tavernary-core vendor/tavernary-core.lock.json src/catalog/catalog-core.ts tests/unit/vendor-lock.test.ts tests/contract/catalog-core-fixtures.test.ts package.json package-lock.json
git commit -m "build: vendor Tavernary catalog core"
```

### Task 2: Implement the atomic catalog cache

**Files:**
- Create: `src/catalog/catalog-cache.ts`
- Create: `src/catalog/indexeddb-catalog-cache.ts`
- Create: `src/catalog/catalog-status.ts`
- Test: `tests/unit/catalog-cache.test.ts`
- Test: `tests/helpers/memory-catalog-cache.ts`

**Interfaces:**
- Consumes: validated `CatalogV7` text plus ETag and timestamps.
- Produces: `CatalogCache` with `readActive`, `stage`, `activate`, and `recordCheck`; `CatalogCacheRecord`; and `CatalogStatus`.

- [ ] **Step 1: Write failing atomicity tests**

```ts
it("keeps the old active record when staging is interrupted", async () => {
  const cache = createMemoryCatalogCache({ failActivate: true });
  await cache.stage(firstRecord);
  await cache.activate(firstRecord.id);
  await cache.stage(secondRecord);
  await expect(cache.activate(secondRecord.id)).rejects.toThrow("activate failed");
  await expect(cache.readActive()).resolves.toEqual(firstRecord);
});
```

Add cases for empty cache, active pointer to a missing slot, metadata-only `lastCheckedAt` updates, and pruning all but active plus one staged record.

- [ ] **Step 2: Run tests and observe missing cache failures**

Run: `npm.cmd test -- tests/unit/catalog-cache.test.ts`

Expected: FAIL because cache interfaces do not exist.

- [ ] **Step 3: Define cache records**

```ts
export interface CatalogCacheRecord {
  id: string;
  schemaVersion: 7;
  generatedAt: string;
  etag: string | null;
  fetchedAt: string;
  bodySha256: string;
  body: string;
}
```

Use database `tavernary-companion`, version `1`, object stores `catalog-records` and `catalog-meta`, and active key `activeCatalogRecordId`.

- [ ] **Step 4: Implement memory and IndexedDB stores**

Use one readwrite transaction for `activate`: verify staged ID exists, update active pointer, then prune obsolete records. A failed transaction leaves the prior pointer intact. `readActive` returns `null` if pointer or record is missing and records a recoverable cache-corruption status.

- [ ] **Step 5: Run cache tests with fake IndexedDB**

Run: `npm.cmd test -- tests/unit/catalog-cache.test.ts`

Expected: PASS for memory and IndexedDB contract suites.

- [ ] **Step 6: Commit**

```powershell
git add -- src/catalog/catalog-cache.ts src/catalog/indexeddb-catalog-cache.ts src/catalog/catalog-status.ts tests/unit/catalog-cache.test.ts tests/helpers/memory-catalog-cache.ts package.json package-lock.json
git commit -m "feat(catalog): add atomic cache"
```

### Task 3: Implement conditional refresh and compatibility states

**Files:**
- Create: `src/catalog/catalog-client.ts`
- Create: `src/catalog/catalog-transport.ts`
- Create: `src/catalog/catalog-errors.ts`
- Test: `tests/unit/catalog-client.test.ts`
- Test: `tests/helpers/catalog-fixtures.ts`

**Interfaces:**
- Consumes: `CatalogCache`, `parseCatalogV7`, fetch, clock, and SHA-256 implementation.
- Produces: `CatalogClient.open()`, `refresh({ force })`, and subscribe/read APIs for `CatalogSnapshot`.

- [ ] **Step 1: Write failing refresh tests**

```ts
it("renders compatible cache before a conditional refresh resolves", async () => {
  const request = deferred<Response>();
  const client = createClient({ cache: seededCache, fetch: () => request.promise });
  const opening = client.open();
  expect(client.read().state).toBe("ready-stale");
  request.resolve(new Response(null, { status: 304, headers: { ETag: '"abc"' } }));
  await opening;
  expect(client.read().state).toBe("ready-current");
});
```

Add cases for `If-None-Match`, 304 metadata update, changed valid response, malformed JSON, schema 8 with and without cache, network error, 15-minute open throttle, forced refresh, and one-hour focus recheck.

- [ ] **Step 2: Run tests and observe missing-client failures**

Run: `npm.cmd test -- tests/unit/catalog-client.test.ts`

Expected: FAIL because `CatalogClient` is absent.

- [ ] **Step 3: Define explicit snapshot states**

Use the discriminated union `empty-loading`, `ready-current`, `ready-stale`, `ready-offline`, `incompatible-with-cache`, `incompatible-empty`, and `error-empty`. Only states with compatible catalog data expose `catalog`; incompatible states expose `remoteSchemaVersion` and all mutation eligibility resolves false.

- [ ] **Step 4: Implement refresh gates in order**

Check HTTP success/content type, read body, parse JSON, inspect integer schema, require schema 7, call `parseCatalogV7`, compute SHA-256, stage, activate, then publish the new snapshot. Parse, schema, hash, storage, or activation failure must leave the previous in-memory catalog and active cache unchanged.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/catalog-client.test.ts tests/unit/catalog-cache.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/catalog/catalog-client.ts src/catalog/catalog-transport.ts src/catalog/catalog-errors.ts tests/unit/catalog-client.test.ts tests/helpers/catalog-fixtures.ts
git commit -m "feat(catalog): refresh living catalog"
```

### Task 4: Reconcile host inventory without silent ownership

**Files:**
- Create: `src/inventory/inventory-types.ts`
- Create: `src/inventory/inventory-reconciler.ts`
- Create: `src/inventory/managed-registry.ts`
- Test: `tests/unit/inventory-reconciler.test.ts`
- Test: `tests/unit/managed-registry.test.ts`

**Interfaces:**
- Consumes: host discovery, catalog projects, and profile `managedExtensions`.
- Produces: `InventorySnapshot` with `managed`, `external`, `unknown`, and `missingManaged` projections.

- [ ] **Step 1: Write failing identity tests**

```ts
it("matches only the validated installation folder identity", () => {
  const snapshot = reconcileInventory({
    projects: [projectWithInstall({ folderName: "Alpha" })],
    hostExtensions: [hostExtension({ folderName: "DifferentAlpha" })],
    managed: {},
  });
  expect(snapshot.external).toHaveLength(0);
  expect(snapshot.unknown).toHaveLength(1);
});
```

Add cases for case-insensitive folder matching, exact canonical project ID ownership, stale managed record after manual deletion, manual matching installation remaining external, and Companion self identity never entering ownership.

- [ ] **Step 2: Run tests and observe missing reconciler failures**

Run: `npm.cmd test -- tests/unit/inventory-reconciler.test.ts tests/unit/managed-registry.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement explicit ownership records**

```ts
export interface ManagedExtensionRecord {
  projectId: string;
  internalName: string;
  folderName: string;
  installedAt: string;
  installedBy: "individual" | "kit";
}
```

`ManagedRegistry.recordInstalled` requires verified host rediscovery input. `reconcile` removes ownership for absent folders but never creates ownership from discovery.

- [ ] **Step 4: Implement inventory joins**

Join installable catalog projects by case-insensitive normalized `install.folderName`, the exact identity SillyTavern derives from the validated repository URL. Ambiguous matches become unknown and non-actionable rather than choosing one. Manifest data is displayed and retained as evidence but is not promoted into a public-contract field that schema 7 does not define.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/inventory-reconciler.test.ts tests/unit/managed-registry.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/inventory tests/unit/inventory-reconciler.test.ts tests/unit/managed-registry.test.ts
git commit -m "feat(inventory): reconcile installed extensions"
```

### Task 5: Build discovery view models

**Files:**
- Create: `src/catalog/discovery-controller.ts`
- Create: `src/catalog/project-view-model.ts`
- Create: `src/catalog/installed-view-model.ts`
- Test: `tests/unit/discovery-controller.test.ts`
- Test: `tests/unit/project-view-model.test.ts`

**Interfaces:**
- Consumes: CatalogCore index/selectors, `CatalogSnapshot`, `InventorySnapshot`, and route-local query.
- Produces: immutable `DiscoveryState`, `ProjectCardViewModel`, `ProjectDetailViewModel`, and `InstalledSectionViewModel`.

- [ ] **Step 1: Write failing default and actionability tests**

```ts
expect(controller.read().query).toMatchObject({
  frontends: ["sillytavern"],
  kinds: ["extension", "preset"],
});

expect(toProjectCardViewModel(otherFrontendProject, context).action).toEqual({
  kind: "view-project",
  label: "View project",
  reason: "Browse-only in Companion",
});
```

Add cases for installed managed -> Uninstall, installed external -> Uninstall, Companion -> Current extension, incompatible schema -> update-required, invalid contract -> View project, and installed unknown -> Manage in SillyTavern.

- [ ] **Step 2: Run tests and observe missing-controller failures**

Run: `npm.cmd test -- tests/unit/discovery-controller.test.ts tests/unit/project-view-model.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement route-local query and selector composition**

Preserve literal search text, pass normalization to CatalogCore, rebuild the index only when catalog identity changes, and recompute view models when inventory changes without reordering catalog results.

- [ ] **Step 4: Implement installed sections**

Produce sections `Managed by Companion`, `Installed outside Companion`, `Not found in current catalog`, and `Needs attention`. A project may appear in one inventory ownership section and additionally in Needs attention through a reference, not through duplicated primary rows.

- [ ] **Step 5: Run focused and contract tests**

Run: `npm.cmd test -- tests/unit/discovery-controller.test.ts tests/unit/project-view-model.test.ts tests/contract/catalog-core-fixtures.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/catalog/discovery-controller.ts src/catalog/project-view-model.ts src/catalog/installed-view-model.ts tests/unit/discovery-controller.test.ts tests/unit/project-view-model.test.ts
git commit -m "feat(catalog): build discovery models"
```

## Phase exit gate

Run:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- tests/unit/vendor-lock.test.ts tests/contract/catalog-core-fixtures.test.ts tests/unit/catalog-cache.test.ts tests/unit/catalog-client.test.ts tests/unit/inventory-reconciler.test.ts tests/unit/managed-registry.test.ts tests/unit/discovery-controller.test.ts tests/unit/project-view-model.test.ts
npm.cmd run build
```

Record fixture count, full-catalog parse time, search index construction time, result count for the default query, cache database version, and production bundle size in the roadmap.
