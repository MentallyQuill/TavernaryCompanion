# Intensive Live QA Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the persistence, Kit lifecycle, uninstall-review, receipt-layout, and repeated legacy-probe defects confirmed by fresh-profile Playwright testing.

**Architecture:** Make `ProfileStore.update()` await an immediate SillyTavern settings save, keep reload outside the Kit transaction, and carry actual reload need on the durable Kit receipt. Fix planner and layout invariants at their owning layers, and cache host support discovery inside the adapter.

**Tech Stack:** TypeScript 6, Preact, Vitest/Testing Library, Playwright, SillyTavern runtime modules, esbuild.

**Spec:** `docs/superpowers/specs/2026-08-19-intensive-live-qa-fixes-design.md`

## Global Constraints

- A resolved profile-store update must represent a completed immediate settings save, not a scheduled debounce.
- `KitExecutor` must never navigate before its receipt is persisted and journal is cleared.
- Kit receipt reload state must describe actual host mutations.
- Uninstall review groups must be mutually exclusive.
- Long receipt content must remain fully readable without horizontal overflow at desktop and mobile widths.
- Cache only positive support or explicit 404 unsupported evidence; transient failures remain retryable.
- Preserve the dirty primary checkout and implement from current `origin/main` in the isolated worktree.
- Treat SillyTavern's native delete 500 and admin-pattern defect as external host findings.

---

### Task 1: Durable Profile Persistence Boundary

**Files:**
- Modify: `src/state/profile-store.ts`
- Modify: `src/host/runtime-host.ts`
- Modify: `src/extension/bootstrap.ts`
- Modify: `tests/unit/profile-store.test.ts`
- Modify: `tests/unit/bootstrap.test.ts`
- Modify: `tests/unit/runtime-host.test.ts`
- Modify: profile-store construction sites under `tests/`

**Interfaces:**
- Consumes: SillyTavern's exported `saveSettings(): Promise<void>` from `/script.js`.
- Produces: `ProfileStoreDependencies.saveSettings(): void | Promise<void>` and `resolveImmediateSettingsSave(context, loader?)`.

- [ ] **Step 1: Write failing profile-store tests for completion-aware persistence**

Use a deferred promise and assert that `store.update()` and subscriber notification remain pending until `saveSettings` resolves. Preserve the rejection test:

```ts
const save = deferred<void>();
const store = new ProfileStore({ extensionSettings, saveSettings: () => save.promise });
const updating = store.update((draft) => {
  draft.preferences.route = "kits";
});
expect(store.read().preferences.route).toBe("projects");
expect(subscriber).not.toHaveBeenCalled();
save.resolve();
await updating;
expect(store.read().preferences.route).toBe("kits");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/profile-store.test.ts`

Expected: FAIL because `ProfileStore` still requires `saveSettingsDebounced` and commits against a non-durable callback.

- [ ] **Step 3: Replace the store dependency and retain serialized rollback semantics**

Rename the dependency to `saveSettings`, await it in the existing queue, and do not publish `#state` or subscribers until it completes.

- [ ] **Step 4: Add failing runtime/bootstrap tests for immediate-save resolution**

Cover an injected `context.saveSettings`, a loader returning `{ saveSettings }`, and a malformed module. Assert bootstrap passes the resolved immediate function to `ProfileStore` and never falls back to `saveSettingsDebounced`.

- [ ] **Step 5: Implement the runtime resolver and bootstrap wiring**

Add:

```ts
export interface SillyTavernScriptModule {
  saveSettings(): Promise<void>;
}

export async function resolveImmediateSettingsSave(
  context: RuntimeSillyTavernContext,
  loadScriptModule = async () => import(/* @vite-ignore */ "/script.js"),
): Promise<() => Promise<void>>;
```

Allow `RuntimeSillyTavernContext.saveSettings` as a deterministic override. Validate the resolved export and throw a clear initialization error when absent.

- [ ] **Step 6: Mechanically update test fixtures and verify GREEN**

Run: `npm.cmd test -- tests/unit/profile-store.test.ts tests/unit/bootstrap.test.ts tests/unit/runtime-host.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the persistence slice**

```text
fix(state): await durable profile saves
```

---

### Task 2: Transaction-Safe Kit Completion and Clear Uninstall Plans

**Files:**
- Modify: `src/kits/kit-receipt.ts`
- Modify: `src/kits/kit-executor.ts`
- Modify: `src/kits/kit-planner.ts`
- Modify: `src/ui/kits/kit-operation-tray.tsx`
- Modify: `src/ui/kits/kit-receipt.tsx`
- Modify: `src/ui/popup-host.tsx`
- Modify: `tests/unit/kit-executor.test.ts`
- Modify: `tests/unit/kit-planner.test.ts`
- Modify: `tests/unit/kit-preflight-ui.test.tsx`
- Modify: Kit receipt fixtures under `tests/`

**Interfaces:**
- Consumes: existing `KitPlan`, actual executor `changed` flags, durable `ProfileStore`, and `HostExtensionAdapter.reload()`.
- Produces: `KitReceipt.reloadRequired: boolean` and `KitOperationTray.onReload(): void`.

- [ ] **Step 1: Write failing executor tests for post-commit reload ownership**

Exercise install/activate/deactivate/uninstall success and partial paths. Assert `host.reload` is never called, `receipt.reloadRequired` reflects actual mutations, the stored receipt equals the returned receipt, and `kitOperationJournal` is null when `execute()` resolves.

- [ ] **Step 2: Write a failing planner invariant test**

For an uninstall containing one final-reference managed project and one shared project, assert:

```ts
expect(plan.remove.map(({ projectId }) => projectId)).toEqual(["final"]);
expect(plan.keptForOtherKits.map(({ projectId }) => projectId)).toEqual(["shared"]);
expect(plan.alreadyManaged).toEqual([]);
```

- [ ] **Step 3: Run focused Kit tests and verify RED**

Run: `npm.cmd test -- tests/unit/kit-executor.test.ts tests/unit/kit-planner.test.ts tests/unit/kit-preflight-ui.test.tsx`

Expected: FAIL because the executor reloads internally, receipts lack reload state, and uninstall duplicates managed members.

- [ ] **Step 4: Move reload state onto the receipt**

Remove every executor `host.reload()` call. Thread an actual `changed` boolean through receipt creation for all terminal branches. Persist the receipt and clear the journal before returning. Recovery receipts set `reloadRequired: false`.

- [ ] **Step 5: Render an explicit Kit reload action**

Add `onReload` to `KitOperationTray`/`KitReceipt` and render **Reload now** only when `receipt.reloadRequired`. Wire it to `host.reload()` in `popup-host.tsx`; retain Dismiss and Try again.

- [ ] **Step 6: Make uninstall plan groups exclusive**

Populate `alreadyManaged` only for `install`, `activate`, and `deactivate`. During uninstall, route owned projects exclusively to `remove` or `keptForOtherKits`.

- [ ] **Step 7: Run focused Kit tests and verify GREEN**

Run: `npm.cmd test -- tests/unit/kit-executor.test.ts tests/unit/kit-planner.test.ts tests/unit/kit-preflight-ui.test.tsx tests/unit/kit-presentation.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the Kit slice**

```text
fix(kits): commit state before reload
```

---

### Task 3: Responsive Receipt Rows

**Files:**
- Modify: `src/styles/kits.css`
- Modify: `tests/e2e/kit-switching.spec.ts`
- Add: receipt snapshots only if the existing visual-test convention requires them

**Interfaces:**
- Consumes: existing `.tavernary-companion-kit-receipt li` markup.
- Produces: bounded grid rows with wrap-safe project and message columns.

- [ ] **Step 1: Add a failing browser geometry test**

Inject a Kit receipt whose project ID and message each exceed the tray width. At `1024x768` and `390x844`, assert every child bounding box stays inside the receipt row, `scrollWidth <= clientWidth`, and the full text remains visible.

- [ ] **Step 2: Run the focused Playwright test and verify RED**

Run: `npm.cmd run test:e2e -- tests/e2e/kit-switching.spec.ts --grep "wraps long Kit receipts"`

Expected: FAIL because the current row is a non-wrapping `space-between` flex line.

- [ ] **Step 3: Implement the bounded grid layout**

Give Kit receipt rows their own grid rule, set text columns to `min-inline-size: 0` and `overflow-wrap: anywhere`, keep action/status readable, and collapse to one column in the existing narrow-container breakpoint. Do not change dialog/warning row layout unintentionally.

- [ ] **Step 4: Run browser tests and verify GREEN**

Run: `npm.cmd run test:e2e -- tests/e2e/kit-switching.spec.ts`

Expected: PASS at desktop and mobile viewports.

- [ ] **Step 5: Commit the layout slice**

```text
fix(ui): wrap Kit receipt details
```

---

### Task 4: Bounded Legacy Host Probes

**Files:**
- Modify: `src/host/sillytavern-host.ts`
- Modify: `tests/unit/host-contract.test.ts`

**Interfaces:**
- Consumes: existing capability and update-status HTTP contracts plus `HostOperationError.status`.
- Produces: one shared capability promise and tri-state update-support evidence for each adapter instance.

- [ ] **Step 1: Write failing concurrent-probe tests**

Call `getInstallCapabilities()` three times concurrently against a deferred 404 and assert one fetch. Call `inspectUpdate()` for three projects concurrently against a deferred first 404 and assert one update-status fetch; later calls must reject locally without fetching.

- [ ] **Step 2: Write a failing transient-retry test**

Return a network error or HTTP 503 from the first call and a valid response from the second. Assert two fetches and successful retry so non-404 failures are not cached as unsupported.

- [ ] **Step 3: Run host tests and verify RED**

Run: `npm.cmd test -- tests/unit/host-contract.test.ts`

Expected: FAIL because every call currently performs its own probe.

- [ ] **Step 4: Cache explicit support evidence**

Store a capability promise for the adapter lifetime. For update inspection, let one unknown-support caller own the probe while concurrent callers wait. Cache `false` only for explicit 404 and `true` only after a valid response; clear the in-flight probe after transient failure.

- [ ] **Step 5: Run host and update tests and verify GREEN**

Run: `npm.cmd test -- tests/unit/host-contract.test.ts tests/unit/update-coordinator.test.ts tests/unit/install-lifecycle.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the compatibility slice**

```text
fix(host): bound legacy capability probes
```

---

### Task 5: Full Verification, Live Regression, and Main Integration

**Files:**
- Modify only evidence/report files if new durable artifacts are intentionally retained

**Interfaces:**
- Consumes: all four implementation slices and the isolated SillyTavern QA profile workflow.
- Produces: repository gates, fresh Playwright proof, reviewed commits, and an updated GitHub `main`.

- [ ] **Step 1: Run the repository gate**

Run: `npm.cmd run check`

Expected: formatting, lint, typecheck, Vitest, and build all PASS.

- [ ] **Step 2: Run the complete browser suite**

Run: `npm.cmd run test:e2e`

Expected: all Playwright projects PASS with no unexpected snapshot drift.

- [ ] **Step 3: Verify the release artifact**

Run: `npm.cmd run release:verify`

Expected: packaged extension structure and generated bundle verification PASS.

- [ ] **Step 4: Execute a fresh-user live SillyTavern regression**

Create a new isolated user/profile and exercise catalog load/search, newest and checked chooser states, direct install/close/reopen/uninstall, Kit create/install/activate/deactivate/uninstall, explicit reload, recovery, offline cache, and 390-pixel responsive layout. Confirm persisted ownership/receipt/journal state from the profile files after immediate close and reload. Record external host failures separately.

- [ ] **Step 5: Review the final diff and rerun affected gates after fixes**

Inspect `git diff origin/main...HEAD`, verify only intended files changed, and rerun any gate touched by review corrections.

- [ ] **Step 6: Push the verified commits directly to main**

Run: `git push origin HEAD:main`

Expected: fast-forward push succeeds without force.

- [ ] **Step 7: Verify GitHub and installed/deployed parity**

Use authenticated GitHub CLI to confirm `main` SHA and relevant Actions. Rebuild/reinstall the exact final artifact in the QA profile if the push changes the bundle, then repeat the persistence smoke path against that exact SHA.
