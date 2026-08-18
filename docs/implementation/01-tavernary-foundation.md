# Tavernary Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one schema-7 Tavernary catalog with verified SillyTavern install contracts and a framework-neutral CatalogCore consumed by both Tavernary and Companion.

**Architecture:** Tavernary records repository-root manifest evidence at an immutable source head, derives install contracts during its offline catalog build, and writes one generated file under `public/catalog/`. Pure query, validation, search, filter, and Kit selection code moves into `packages/catalog-core`; Tavernary imports that package directly and Companion vendors the same package at an exact Git commit with hashes.

**Tech Stack:** Node.js 24, TypeScript 6, Vitest 4, AJV 8, MiniSearch 7, Next.js static export, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-18-tavernary-companion-design.md`; `docs/design/03-catalog-discovery.md`; `docs/design/06-catalog-refresh-and-recovery.md`

## Global Constraints

- Make Tavernary changes only in `F:\git\Tavernary`.
- Preserve the current provider plus immutable repository-ID source identity model.
- Publish exactly `public/catalog/tavernary-catalog.json`; do not create a secondary feed.
- Increment the catalog contract from schema 6 to schema 7 once; routine content refreshes remain schema 7.
- Only active, published, repository-root SillyTavern extensions with validated manifests receive install contracts.
- The public contract fields are exactly `kind`, `repositoryUrl`, `branch`, `manifestPath`, and `folderName`.
- CatalogCore has no React, Next.js, DOM, filesystem, or SillyTavern dependency.
- Do not publish credential-bearing or non-HTTP(S) repository URLs.
- Do not mutate or replace unrelated dirty Tavernary files.

---

### Task 1: Record repository-root SillyTavern manifest evidence

**Files:**
- Create: `F:\git\Tavernary\data\schemas\extension-install-evidence.schema.json`
- Create: `F:\git\Tavernary\scripts\catalog\extension-install-evidence.mjs`
- Create: `F:\git\Tavernary\scripts\catalog\extension-install-evidence.d.mts`
- Modify: `F:\git\Tavernary\scripts\catalog\github-repository-provider.mjs`
- Modify: `F:\git\Tavernary\scripts\catalog\codeberg-repository-provider.mjs`
- Modify: `F:\git\Tavernary\scripts\catalog\refresh-repositories.mjs`
- Modify: `F:\git\Tavernary\scripts\catalog\validate.mjs`
- Test: `F:\git\Tavernary\tests\unit\extension-install-evidence.test.ts`
- Test: `F:\git\Tavernary\tests\unit\validate-catalog.test.ts`

**Interfaces:**
- Consumes: source records, project kind/frontends, provider repository metadata, and immutable `repository.head_sha`.
- Produces: `ExtensionInstallEvidenceV1` records under `data/snapshots/install/` and `deriveExtensionInstallEvidence(input): ExtensionInstallEvidenceV1 | null`.

- [ ] **Step 1: Write failing evidence tests**

```ts
import { describe, expect, it } from "vitest";
import { deriveExtensionInstallEvidence } from "../../scripts/catalog/extension-install-evidence.mjs";

const repository = {
  provider: "github",
  repositoryUrl: "https://github.com/example/alpha",
  defaultBranch: "main",
  headSha: "a".repeat(40),
};

describe("deriveExtensionInstallEvidence", () => {
  it("accepts a repository-root SillyTavern manifest", () => {
    expect(deriveExtensionInstallEvidence({
      sourceId: "github-42",
      repository,
      manifestPath: "manifest.json",
    manifest: { display_name: "Alpha", key: "alpha", loading_order: 10, js: "index.js" },
      observedAt: "2026-08-18T12:00:00.000Z",
    })).toMatchObject({
      schema_version: 1,
      source_id: "github-42",
      head_sha: "a".repeat(40),
      manifest_path: "manifest.json",
      status: "verified",
      folder_name: "alpha",
    });
  });

  it.each([
    ["nested manifest", "extension/manifest.json", "manifest-not-at-root"],
    ["missing js", "manifest.json", "invalid-manifest"],
  ])("rejects %s", (_label, manifestPath, reason) => {
    expect(deriveExtensionInstallEvidence({
      sourceId: "github-42",
      repository,
      manifestPath,
      manifest: { display_name: "Alpha", key: "alpha" },
      observedAt: "2026-08-18T12:00:00.000Z",
    })).toMatchObject({ status: "unavailable", reason });
  });
});
```

- [ ] **Step 2: Run the focused test and observe the missing-module failure**

Run: `npm.cmd test -- tests/unit/extension-install-evidence.test.ts`

Expected: FAIL because `scripts/catalog/extension-install-evidence.mjs` does not exist.

- [ ] **Step 3: Add the evidence schema and pure derivation**

Use a discriminated record with these required fields:

```js
export function deriveExtensionInstallEvidence(input) {
  const base = {
    schema_version: 1,
    source_id: input.sourceId,
    head_sha: input.repository.headSha,
    observed_at: input.observedAt,
  };
  if (input.manifestPath !== "manifest.json") {
    return { ...base, status: "unavailable", reason: "manifest-not-at-root" };
  }
  const manifest = input.manifest;
  const hasEntry = typeof manifest?.js === "string" || typeof manifest?.css === "string";
  if (!manifest || typeof manifest.display_name !== "string" ||
      !Number.isFinite(manifest.loading_order) || !hasEntry) {
    return { ...base, status: "unavailable", reason: "invalid-manifest" };
  }
  const repositoryName = new URL(input.repository.repositoryUrl)
    .pathname.replace(/\.git$/u, "").split("/").filter(Boolean).at(-1);
  return {
    ...base,
    status: "verified",
    manifest_path: "manifest.json",
    folder_name: repositoryName,
    manifest: {
      display_name: manifest.display_name,
      key: typeof manifest.key === "string" ? manifest.key : null,
      minimum_client_version: manifest.minimum_client_version ?? null,
    },
  };
}
```

- [ ] **Step 4: Fetch evidence only for eligible source candidates**

During repository refresh, request `manifest.json` at the exact observed head only when at least one active published project for the source is kind `extension` and includes frontend `sillytavern`. Persist verified and unavailable evidence at `resolve(root, "data/snapshots/install", `${sourceId}.json`)` using an atomic temporary-file rename. Reuse existing evidence when its `head_sha` equals the repository snapshot head.

- [ ] **Step 5: Validate evidence in `catalog:validate`**

Compile the new schema with AJV. Reject mixed evidence schema versions, a verified record whose source is absent, or evidence whose `head_sha` differs from the associated current repository snapshot.

- [ ] **Step 6: Run focused validation tests**

Run: `npm.cmd test -- tests/unit/extension-install-evidence.test.ts tests/unit/validate-catalog.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- data/schemas/extension-install-evidence.schema.json scripts/catalog/extension-install-evidence.mjs scripts/catalog/extension-install-evidence.d.mts scripts/catalog/github-repository-provider.mjs scripts/catalog/codeberg-repository-provider.mjs scripts/catalog/refresh-repositories.mjs scripts/catalog/validate.mjs tests/unit/extension-install-evidence.test.ts tests/unit/validate-catalog.test.ts
git commit -m "feat(catalog): record extension evidence"
```

### Task 2: Build schema-7 install contracts

**Files:**
- Create: `F:\git\Tavernary\packages\catalog-core\src\catalog-schema.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\src\catalog-types.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\src\install-contract.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\fixtures\catalog-v7-valid.json`
- Create: `F:\git\Tavernary\packages\catalog-core\fixtures\catalog-v7-invalid-install-url.json`
- Modify: `F:\git\Tavernary\scripts\catalog\build.mjs`
- Modify: `F:\git\Tavernary\tests\unit\build-catalog.test.ts`
- Modify: `F:\git\Tavernary\src\features\catalog\catalog-types.ts`

**Interfaces:**
- Consumes: a published project, source record, repository snapshot, and matching verified install evidence.
- Produces: `InstallContract`, `CatalogProject.install: InstallContract | null`, and `CatalogV7` with `schemaVersion: 7`.

- [ ] **Step 1: Write failing contract tests**

Add cases proving a verified GitHub SillyTavern extension receives:

```ts
expect(project.install).toEqual({
  kind: "sillytavern-extension-git",
  repositoryUrl: "https://github.com/example/alpha.git",
  branch: null,
  manifestPath: "manifest.json",
  folderName: "alpha",
});
```

Add table cases proving `install` is `null` for presets, frontends, other-frontend extensions, inactive projects, unavailable sources, nested manifests, stale-head evidence, organization pages, and URL sources.

- [ ] **Step 2: Run the focused build test and observe schema-6 expectations fail**

Run: `npm.cmd test -- tests/unit/build-catalog.test.ts -t "install contract|schemaVersion"`

Expected: FAIL because the catalog remains schema 6 and projects lack `install`.

- [ ] **Step 3: Implement strict install-contract derivation**

```ts
export interface InstallContract {
  kind: "sillytavern-extension-git";
  repositoryUrl: string;
  branch: string | null;
  manifestPath: "manifest.json";
  folderName: string;
}

export function parseInstallContract(value: unknown): InstallContract {
  // Validate exact keys, HTTPS/HTTP URL, absent credentials, `.git` repository
  // URL, root manifest path, nullable branch, and a single safe folder segment.
}
```

The parser must reject URL credentials, query strings, fragments, encoded separators, `.`/`..`, control characters, non-HTTP(S) schemes, and folder names outside `^[A-Za-z0-9._-]+$`.

- [ ] **Step 4: Derive contracts in the catalog build**

Load install evidence by source ID. Add `install` to every public project, using `null` unless every eligibility condition succeeds. Set the top-level schema version to `7` and update the TypeScript literal type.

- [ ] **Step 5: Add schema fixture validation tests**

Test `parseCatalogV7(fixture)` succeeds for `catalog-v7-valid.json`, while the credential-bearing fixture throws a `CatalogValidationError` whose issue path is `projects[0].install.repositoryUrl`.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/build-catalog.test.ts packages/catalog-core/tests/catalog-schema.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- packages/catalog-core/src/catalog-schema.ts packages/catalog-core/src/catalog-types.ts packages/catalog-core/src/install-contract.ts packages/catalog-core/fixtures scripts/catalog/build.mjs tests/unit/build-catalog.test.ts src/features/catalog/catalog-types.ts
git commit -m "feat(catalog): publish install contracts"
```

### Task 3: Extract the framework-neutral CatalogCore package

**Files:**
- Create: `F:\git\Tavernary\packages\catalog-core\package.json`
- Create: `F:\git\Tavernary\packages\catalog-core\tsconfig.json`
- Create: `F:\git\Tavernary\packages\catalog-core\src\index.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\src\project-query.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\src\project-search.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\src\project-selectors.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\src\kit-query.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\src\kit-selectors.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\src\tavernkeeper.ts`
- Create: `F:\git\Tavernary\packages\catalog-core\tests\contract-fixtures.test.ts`
- Modify: `F:\git\Tavernary\package.json`
- Modify: `F:\git\Tavernary\tsconfig.json`
- Modify: `F:\git\Tavernary\src\features\search\catalog-search.ts`
- Modify: `F:\git\Tavernary\src\features\search\search-types.ts`
- Modify: `F:\git\Tavernary\src\features\catalog\catalog-query.ts`
- Modify: `F:\git\Tavernary\src\features\catalog\catalog-selectors.ts`
- Modify: `F:\git\Tavernary\src\features\catalog\tavernkeeper-status.ts`
- Modify: `F:\git\Tavernary\src\features\kits\kit-query.ts`
- Modify: `F:\git\Tavernary\src\features\kits\kit-selectors.ts`
- Modify: `F:\git\Tavernary\src\features\kits\kit-types.ts`
- Test: existing search, selector, query, and Kit unit suites

**Interfaces:**
- Consumes: `CatalogV7`, `CatalogQuery`, and `KitQuery` plain data.
- Produces: `parseCatalogV7`, `createCatalogSearchIndex`, `selectProjects`, `parseCatalogQuery`, `serializeCatalogQuery`, `selectKits`, `deriveTavernKeeperCardStatus`, and all associated types.

- [ ] **Step 1: Add the package-boundary test**

```ts
import * as core from "@tavernary/catalog-core";

it("exports the complete headless contract", () => {
  expect(Object.keys(core).sort()).toEqual(expect.arrayContaining([
    "createCatalogSearchIndex",
    "parseCatalogQuery",
    "parseCatalogV7",
    "selectKits",
    "selectProjects",
    "serializeCatalogQuery",
  ]));
});
```

Add a static dependency test that scans `packages/catalog-core/src` and fails on imports containing `react`, `next/`, `window`, `document`, `node:fs`, or the Tavernary `@/` alias.

- [ ] **Step 2: Run the package test and observe resolution failure**

Run: `npm.cmd test -- packages/catalog-core/tests/contract-fixtures.test.ts`

Expected: FAIL because `@tavernary/catalog-core` is not defined.

- [ ] **Step 3: Define the workspace package**

Use package name `@tavernary/catalog-core`, `type: module`, and source exports. Add it as a file workspace dependency in Tavernary. Its only runtime dependencies are `ajv`, `ajv-formats`, and `minisearch`.

- [ ] **Step 4: Move pure behavior without compatibility forks**

Move the existing implementation into the package, replacing `@/` imports with relative package imports. Existing application paths become thin re-exports during this commit so the website and current tests consume exactly one implementation.

- [ ] **Step 5: Add shared behavioral fixtures**

Create JSON cases for literal-input preservation, AND search, `+` union, relevance/browse sorts, frontend/kind defaults, license/activity filters, Kit filters, and TavernKeeper concern freshness. The contract test must execute every fixture through public package exports.

- [ ] **Step 6: Run focused and existing behavior tests**

Run: `npm.cmd test -- packages/catalog-core/tests tests/unit/catalog-search.test.ts tests/unit/catalog-selectors.test.ts tests/unit/catalog-query.test.ts tests/unit/kit-selectors.test.ts tests/unit/kit-query.test.ts`

Expected: PASS with identical existing results.

- [ ] **Step 7: Run typecheck**

Run: `npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add -- package.json package-lock.json tsconfig.json packages/catalog-core src/features/catalog/catalog-query.ts src/features/catalog/catalog-selectors.ts src/features/catalog/tavernkeeper-status.ts src/features/search/catalog-search.ts src/features/search/search-types.ts src/features/kits/kit-query.ts src/features/kits/kit-selectors.ts src/features/kits/kit-types.ts tests/unit
git commit -m "refactor(catalog): extract shared core"
```

### Task 4: Publish one canonical catalog asset

**Files:**
- Modify: `F:\git\Tavernary\scripts\catalog\build.mjs`
- Modify: `F:\git\Tavernary\src\lib\catalog\load-catalog.ts`
- Modify: `F:\git\Tavernary\tests\unit\static-export-verification.test.ts`
- Modify: `F:\git\Tavernary\scripts\verify-static-export.mjs`
- Create: `F:\git\Tavernary\tests\unit\canonical-catalog-asset.test.ts`
- Generate: `F:\git\Tavernary\public\catalog\tavernary-catalog.json`
- Remove after parity migration: `F:\git\Tavernary\src\generated\catalog.json`

**Interfaces:**
- Consumes: `buildCatalog()` output.
- Produces: the one file consumed at build time and served by Pages.

- [ ] **Step 1: Write a failing byte-parity test**

```ts
it("loads the exact public catalog bytes used by Pages", async () => {
  const publicBytes = await readFile("public/catalog/tavernary-catalog.json", "utf8");
  expect(JSON.parse(publicBytes)).toEqual(loadCatalog());
  expect(JSON.parse(publicBytes).schemaVersion).toBe(7);
});
```

- [ ] **Step 2: Run the focused test and observe the missing-public-file failure**

Run: `npm.cmd test -- tests/unit/canonical-catalog-asset.test.ts`

Expected: FAIL because the builder still writes `src/generated/catalog.json`.

- [ ] **Step 3: Move the atomic build target**

Change `outputPath` to `public/catalog/tavernary-catalog.json`. Make `loadCatalog()` read and parse that same file at build time; do not copy it into another generated location.

- [ ] **Step 4: Strengthen static-export verification**

Require `out/catalog/tavernary-catalog.json`, JSON MIME compatibility, schema 7, and byte equality between `public/` and `out/`. Assert no root `out/catalog.json` or obsolete `src/generated/catalog.json` is used.

- [ ] **Step 5: Run the content gate**

Run: `npm.cmd run check:content`

Expected: PASS and `out/catalog/tavernary-catalog.json` exists.

- [ ] **Step 6: Commit**

```powershell
git add -- scripts/catalog/build.mjs src/lib/catalog/load-catalog.ts tests/unit/canonical-catalog-asset.test.ts tests/unit/static-export-verification.test.ts scripts/verify-static-export.mjs public/catalog/tavernary-catalog.json src/generated/catalog.json
git commit -m "feat(catalog): publish canonical asset"
```

### Task 5: Lock CatalogCore into Companion

**Files:**
- Create: `scripts/sync-tavernary-core.mjs`
- Create: `tests/unit/vendor-lock.test.ts`
- Create: `vendor/tavernary-core.lock.json`
- Create through sync: `vendor/tavernary-core/`
- Modify later scaffold command in: `package.json`

**Interfaces:**
- Consumes: an exact Tavernary commit and `packages/catalog-core` tree.
- Produces: a deterministic vendored tree plus `commit`, `sourcePath`, and sorted `{ path, sha256 }[]` lock entries.

- [ ] **Step 1: Write the failing lock-verification test**

```ts
import { verifyVendorLock } from "../../scripts/sync-tavernary-core.mjs";

it("matches every vendored CatalogCore file to its lock hash", async () => {
  await expect(verifyVendorLock({ root: process.cwd() })).resolves.toEqual({ ok: true });
});
```

- [ ] **Step 2: Run the focused test and observe missing sync module failure**

Run: `npm.cmd test -- tests/unit/vendor-lock.test.ts`

Expected: FAIL until the Companion scaffold from Phase 2 supplies the test runner and sync module. Record this as an intentionally fixture-blocked red test if Phase 2 has not started.

- [ ] **Step 3: Implement deterministic sync**

The command accepts `--repo`, `--commit`, and optional `--local`. It reads only `packages/catalog-core`, rejects a dirty local Tavernary source when `--local` is used, sorts paths ordinally, copies into a temporary directory, hashes bytes with SHA-256, validates the package tests/fixtures are present, and atomically replaces `vendor/tavernary-core` plus the lock.

- [ ] **Step 4: Sync from the verified Tavernary commit**

Run:

```powershell
$tavernarySha = git -c safe.directory=F:/git/Tavernary -C F:\git\Tavernary rev-parse HEAD
npm.cmd run vendor:sync -- --local F:\git\Tavernary --commit $tavernarySha
```

Expected: the lock records the exact SHA returned by `git -C F:\git\Tavernary rev-parse HEAD` and every hash verifies.

- [ ] **Step 5: Run both fixture suites**

Run in Tavernary: `npm.cmd test -- packages/catalog-core/tests`

Run in Companion: `npm.cmd test -- tests/unit/vendor-lock.test.ts tests/contract/catalog-core-fixtures.test.ts`

Expected: PASS in both repositories with the same fixture count.

- [ ] **Step 6: Commit Companion lock**

```powershell
git add -- scripts/sync-tavernary-core.mjs tests/unit/vendor-lock.test.ts tests/contract/catalog-core-fixtures.test.ts vendor/tavernary-core vendor/tavernary-core.lock.json package.json package-lock.json
git commit -m "build: lock Tavernary catalog core"
```

## Phase exit gate

Run in Tavernary:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run catalog:validate
npm.cmd run catalog:build
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run verify:export
```

Run in Companion after Phase 2 establishes tooling:

```powershell
npm.cmd test -- tests/unit/vendor-lock.test.ts tests/contract/catalog-core-fixtures.test.ts
```

Record the Tavernary commit, generated catalog SHA-256, schema version, project count, installable-project count, Kit count, and Companion lock commit in the roadmap. Live Pages proof belongs to Phase 8.
