# Companion Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an installable, tested Tavernary Companion extension with a strict SillyTavern host boundary, durable profile state, deterministic builds, and a native launcher.

**Architecture:** TypeScript domain modules compile into one browser ESM bundle and one CSS bundle. Preact renders UI inside a native SillyTavern popup, while all SillyTavern imports and endpoint behavior remain in `SillyTavernHostAdapter`. Public catalog cache is separate from profile-scoped extension settings.

**Tech Stack:** Node.js 24, TypeScript 6, Preact 10, esbuild, Vitest 4, jsdom, ESLint, Prettier, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-18-tavernary-companion-design.md`; `docs/design/01-product-experience.md`; `docs/design/02-responsive-shell-and-visual-system.md`

## Global Constraints

- Make Companion changes only in `F:\git\TavernaryCompanion`.
- Use the standard SillyTavern extension contract; do not inspect or branch on host product names.
- Set `minimum_client_version` to `1.12.0`.
- Bundle dependencies; runtime code must not import from a CDN or execute remote code.
- Keep `manifest.json` at repository root and production files under `dist/`.
- Do not add update behavior for third-party extensions.
- Keep all lifecycle calls behind `HostExtensionAdapter`.
- Use canonical project ID `mentallyquill-tavernary-companion` in domain policy.

---

### Task 1: Establish the TypeScript extension scaffold

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `eslint.config.mjs`
- Create: `prettier.config.mjs`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `manifest.json`
- Create: `scripts/build.mjs`
- Create: `src/extension/index.ts`
- Create: `src/styles/companion.css`
- Test: `tests/unit/scaffold.test.ts`

**Interfaces:**
- Consumes: SillyTavern's extension loader.
- Produces: `dist/extension.js`, `dist/companion.css`, and exported lifecycle hook functions.

- [ ] **Step 1: Write the failing scaffold test**

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("extension scaffold", () => {
  it("exposes one ESM entry and stylesheet", async () => {
    const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
    expect(manifest).toMatchObject({
      display_name: "Tavernary Companion",
      key: "tavernary-companion",
      js: "dist/extension.js",
      css: "dist/companion.css",
      minimum_client_version: "1.12.0",
      auto_update: false,
    });
  });
});
```

- [ ] **Step 2: Run the test and observe missing-package or missing-manifest failure**

Run: `npm.cmd test -- tests/unit/scaffold.test.ts`

Expected: FAIL before the scaffold exists.

- [ ] **Step 3: Add package scripts and pinned toolchain**

Use these scripts:

```json
{
  "scripts": {
    "build": "node scripts/build.mjs",
    "dev": "node scripts/build.mjs --watch",
    "format:check": "prettier --check .",
    "format": "prettier --write .",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "vendor:sync": "node scripts/sync-tavernary-core.mjs",
    "check": "npm run format:check && npm run lint && npm run typecheck && npm test && npm run build"
  }
}
```

Set `type: module`, `private: true`, and Node engine `>=24 <25`. Pin installed dependency versions through `package-lock.json`.

- [ ] **Step 4: Add manifest and minimal entry**

```ts
export async function tavernaryCompanionOnInstall(): Promise<void> {}
export async function tavernaryCompanionOnUpdate(): Promise<void> {}
export async function tavernaryCompanionOnDelete(): Promise<void> {}
export async function tavernaryCompanionOnEnable(): Promise<void> {}
export async function tavernaryCompanionOnDisable(): Promise<void> {}
```

Reference these names from `manifest.json` hooks. Use loading order `22`, one after Directive's current order, without depending on Directive.

- [ ] **Step 5: Add deterministic esbuild output**

Bundle `src/extension/index.ts` as browser ESM to `dist/extension.js`, bundle CSS to `dist/companion.css`, externalize only absolute SillyTavern modules `/script.js`, `/scripts/extensions.js`, and `/scripts/popup.js`, and fail on warnings. A normal build removes only these two known output files before rewriting them.

- [ ] **Step 6: Install dependencies and run the focused test**

Run: `npm.cmd install`

Run: `npm.cmd test -- tests/unit/scaffold.test.ts`

Expected: PASS.

- [ ] **Step 7: Build and inspect outputs**

Run: `npm.cmd run build`

Expected: both declared production files exist, the JS parses as ESM, and neither output contains `http://` or `https://` JavaScript imports.

- [ ] **Step 8: Commit**

```powershell
git add -- package.json package-lock.json tsconfig.json vitest.config.ts playwright.config.ts eslint.config.mjs prettier.config.mjs .gitignore .nvmrc manifest.json scripts/build.mjs src/extension/index.ts src/styles/companion.css tests/unit/scaffold.test.ts dist/extension.js dist/companion.css
git commit -m "build: scaffold Companion extension"
```

### Task 2: Define the host contract and fake host

**Files:**
- Create: `src/host/host-types.ts`
- Create: `src/host/host-errors.ts`
- Create: `src/host/sillytavern-host.ts`
- Create: `tests/helpers/fake-host.ts`
- Test: `tests/unit/host-contract.test.ts`

**Interfaces:**
- Consumes: SillyTavern `extensionNames`, `extension_settings.disabledExtensions`, `getExtensionManifest`, `getRequestHeaders`, `enableExtension`, `disableExtension`, and native popup APIs.
- Produces: `HostExtensionAdapter` with `discover`, `install`, `remove`, `enable`, `disable`, `reload`, `openExtensionManager`, `openExternal`, and `showPopup`.

- [ ] **Step 1: Write the failing contract test**

```ts
import { expect, it } from "vitest";
import { createFakeHost } from "../helpers/fake-host";

it("discovers canonical host identities and enabled state", async () => {
  const host = createFakeHost({
    extensions: [{
      internalName: "third-party/Alpha",
      folderName: "Alpha",
      enabled: false,
      manifest: { key: "alpha", display_name: "Alpha", version: "1.0.0" },
    }],
  });
  await expect(host.discover()).resolves.toEqual([
    expect.objectContaining({ internalName: "third-party/Alpha", folderName: "Alpha", enabled: false }),
  ]);
});
```

- [ ] **Step 2: Run the test and observe missing types/fake failure**

Run: `npm.cmd test -- tests/unit/host-contract.test.ts`

Expected: FAIL because `HostExtensionAdapter` and `createFakeHost` do not exist.

- [ ] **Step 3: Define exact host types**

```ts
export interface HostExtension {
  internalName: string;
  folderName: string;
  enabled: boolean;
  type: "local" | "global";
  manifest: Record<string, unknown> | null;
}

export interface HostExtensionAdapter {
  discover(): Promise<HostExtension[]>;
  install(input: { repositoryUrl: string; branch: string | null }): Promise<void>;
  remove(input: { internalName: string; type: "local" | "global" }): Promise<void>;
  enable(internalName: string): Promise<void>;
  disable(internalName: string): Promise<void>;
  reload(): void;
  openExtensionManager(): Promise<void>;
  openExternal(url: string): void;
  showPopup(content: HTMLElement, options: HostPopupOptions): Promise<void>;
}
```

- [ ] **Step 4: Implement `FakeHost` as an authoritative state machine**

The fake clones inputs, records calls in order, mutates state only after configured success, supports per-operation failures, and increments `reloadCount`. It must never return direct references to internal state.

- [ ] **Step 5: Implement the SillyTavern adapter**

Use native exports where they support no-reload operation. For removal, call `/api/extensions/delete` with `getRequestHeaders()` and check `response.ok` instead of using SillyTavern's helper that always reloads. For enable/disable, call the exported functions with `reload = false`. After every operation, `discover()` rereads `extensionNames`, manifests, types, and `disabledExtensions`; it does not trust endpoint response text as final state.

- [ ] **Step 6: Add URL and safe-error tests**

Prove install rejects a non-HTTP(S) URL before host fetch, remove checks HTTP status, response bodies are truncated to 500 printable characters in `HostOperationError`, and request headers never enter errors or receipts.

- [ ] **Step 7: Run focused tests**

Run: `npm.cmd test -- tests/unit/host-contract.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add -- src/host/host-types.ts src/host/host-errors.ts src/host/sillytavern-host.ts tests/helpers/fake-host.ts tests/unit/host-contract.test.ts
git commit -m "feat(host): add extension adapter"
```

### Task 3: Add versioned profile state and storage

**Files:**
- Create: `src/state/profile-state.ts`
- Create: `src/state/profile-store.ts`
- Create: `src/state/state-migrations.ts`
- Test: `tests/unit/profile-store.test.ts`
- Test: `tests/unit/state-migrations.test.ts`

**Interfaces:**
- Consumes: SillyTavern `extension_settings` and `saveSettingsDebounced`.
- Produces: `ProfileStateV1`, `ProfileStore.read()`, and serialized writes under `extension_settings.tavernaryCompanion`.

- [ ] **Step 1: Write failing default and round-trip tests**

```ts
expect(createDefaultProfileState()).toEqual({
  formatVersion: 1,
  trustAcknowledgedAt: null,
  preferences: { route: "projects", density: "standard" },
  managedExtensions: {},
  personalKits: {},
  installedKits: {},
  activeKitId: null,
  operationReceipt: null,
});
```

Also prove unknown keys are discarded, malformed collections become empty, valid local Kit order survives, and a write clones input before handing it to SillyTavern.

- [ ] **Step 2: Run tests and observe missing-state failures**

Run: `npm.cmd test -- tests/unit/profile-store.test.ts tests/unit/state-migrations.test.ts`

Expected: FAIL because the store is absent.

- [ ] **Step 3: Implement validated migration**

`migrateProfileState(value)` accepts only objects, dispatches by integer `formatVersion`, normalizes V1, and throws `UnsupportedProfileStateError` for a future positive version. Corrupt V1 fields are repaired independently so one malformed preference cannot erase Kits or ownership.

- [ ] **Step 4: Implement serialized writes**

Use a promise queue so concurrent `update(mutator)` calls commit in invocation order. Each update reads the latest in-memory value, applies a pure mutator to `structuredClone`, validates, assigns the namespace, invokes `saveSettingsDebounced`, and notifies subscribers once.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/profile-store.test.ts tests/unit/state-migrations.test.ts`

Expected: PASS, including a two-update ordering test.

- [ ] **Step 6: Commit**

```powershell
git add -- src/state/profile-state.ts src/state/profile-store.ts src/state/state-migrations.ts tests/unit/profile-store.test.ts tests/unit/state-migrations.test.ts
git commit -m "feat(state): persist profile data"
```

### Task 4: Bootstrap the extension and native launcher

**Files:**
- Create: `src/extension/bootstrap.ts`
- Create: `src/extension/lifecycle.ts`
- Create: `src/ui/launcher.ts`
- Create: `src/ui/popup-host.tsx`
- Modify: `src/extension/index.ts`
- Modify: `src/styles/companion.css`
- Test: `tests/unit/bootstrap.test.ts`
- Test: `tests/unit/launcher.test.tsx`

**Interfaces:**
- Consumes: `globalThis.SillyTavern.getContext()`, `#extensionsMenu`, and `HostExtensionAdapter.showPopup`.
- Produces: one idempotent launcher, one mounted Companion popup root, and disposable lifecycle state.

- [ ] **Step 1: Write failing idempotence tests**

```ts
it("mounts exactly one Tavernary Companion launcher", async () => {
  document.body.innerHTML = '<div id="extensionsMenu"></div>';
  await bootstrapCompanion(fakeContext);
  await bootstrapCompanion(fakeContext);
  expect(document.querySelectorAll("[data-tavernary-companion-launcher]")).toHaveLength(1);
});
```

Add a test that missing context returns `{ ok: false, reason: "missing-context" }` without throwing.

- [ ] **Step 2: Run focused tests and observe missing bootstrap failure**

Run: `npm.cmd test -- tests/unit/bootstrap.test.ts tests/unit/launcher.test.tsx`

Expected: FAIL because bootstrap and launcher modules do not exist.

- [ ] **Step 3: Implement document-ready bootstrap**

Use DOMContentLoaded without requiring jQuery. Resolve the context exactly once per bootstrap attempt, construct the host/store services, and mount the launcher. Expose only frozen test hooks; do not expose mutation services on `globalThis`.

- [ ] **Step 4: Implement launcher semantics**

Append a button labeled `Tavernary Companion` to `#extensionsMenu`. Opening creates a fresh popup content root and renders `CompanionShell` through Preact. Reopening focuses the existing popup rather than creating duplicates. Disposal removes listeners, Preact roots, and launcher nodes.

- [ ] **Step 5: Implement lifecycle hooks**

Install/update/enable/activate call idempotent bootstrap. Disable/delete/clean dispose UI and in-memory work without deleting personal state; only the user-controlled reset action introduced later may remove settings.

- [ ] **Step 6: Run focused tests and build**

Run: `npm.cmd test -- tests/unit/bootstrap.test.ts tests/unit/launcher.test.tsx`

Run: `npm.cmd run build`

Expected: PASS and the bundle exports every hook named in `manifest.json`.

- [ ] **Step 7: Commit**

```powershell
git add -- src/extension/bootstrap.ts src/extension/lifecycle.ts src/extension/index.ts src/ui/launcher.ts src/ui/popup-host.tsx src/styles/companion.css tests/unit/bootstrap.test.ts tests/unit/launcher.test.tsx dist/extension.js dist/companion.css
git commit -m "feat(shell): add native launcher"
```

## Phase exit gate

Run:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Then install the built folder into an isolated SillyTavern profile and prove the extension loads, the launcher appears once, the popup opens and closes, disable removes the launcher, enable restores it after reload, and the console has no unexpected errors. Record source SHA and built-file SHA-256 values in the roadmap.
