# Installed Extension Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add forward-only update checking and exact update actions to catalog-matched local extensions on the Installed page.

**Architecture:** Keep update availability in a session-only `ExtensionUpdateCoordinator` that is separate from inventory reconciliation. The coordinator asks an explicit host update-status contract for clean checkout and ancestry evidence, derives immutable checked/newest targets, revalidates under the shared lifecycle lock, and verifies the exact resulting commit before publishing a receipt.

**Tech Stack:** TypeScript 6, Preact, Vitest/Testing Library, Playwright, SillyTavern extension HTTP APIs, esbuild.

**Spec:** `docs/superpowers/specs/2026-08-19-installed-extension-updates-design.md`

## Global Constraints

- Update Companion-managed and externally installed local extensions only when their Git origin matches the current catalog install contract.
- Preserve managed/external ownership across updates.
- Offer only commits proven to be forward descendants of the installed commit; never implement rollback or downgrade.
- Never reset, stash, force, merge, or discard local work.
- Keep update state in memory for the current popup session; do not migrate or persist profile state.
- Do not add bulk update, background polling, automatic reload, global-extension update, or Companion self-update.
- Reuse the current operation lock, target-aware TavernKeeper prompts, overlay interaction, and receipt infrastructure.

---

### Task 1: Pure Update Target Model

**Files:**
- Create: `src/updates/update-types.ts`
- Create: `src/updates/update-targets.ts`
- Test: `tests/unit/update-targets.test.ts`

**Interfaces:**
- Consumes: `CatalogProject`, `InstallTarget`, and full 40-hex commit hashes.
- Produces: `HostUpdateInspection`, `UpdateAvailability`, `PreparedUpdateSelection`, `deriveUpdateAvailability()`, `bindUpdateSelection()`, `matchesUpdateBinding()`, and `sameRepositoryUrl()`.

- [ ] **Step 1: Write failing tests for conservative repository identity and forward-only target selection**

```ts
expect(sameRepositoryUrl("https://github.com/Owner/Repo.git", "https://github.com/Owner/Repo/")).toBe(true);
expect(sameRepositoryUrl("https://github.com/Owner/Repo", "https://github.com/Owner/Other")).toBe(false);
expect(deriveUpdateAvailability({ project, inspection: behindBoth })).toMatchObject({
  kind: "available",
  targets: [{ kind: "checked" }, { kind: "newest" }],
});
expect(deriveUpdateAvailability({ project, inspection: scannedAheadNewestEqual })).toMatchObject({
  kind: "available",
  notice: "You already have the latest scanned version.",
  targets: [{ kind: "newest" }],
});
expect(deriveUpdateAvailability({ project, inspection: dirty })).toEqual({
  kind: "attention",
  reason: "This extension has local changes. Manage it in SillyTavern.",
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/update-targets.test.ts`

Expected: FAIL because `src/updates/update-targets.ts` does not exist.

- [ ] **Step 3: Add exact types and minimal derivation**

```ts
export type RevisionRelationship = "equal" | "behind" | "ahead" | "diverged";

export interface HostUpdateInspection {
  installedSha: string;
  newestSha: string;
  remoteUrl: string;
  branch: string;
  worktreeClean: boolean;
  branchMatches: boolean;
  exactUpdateSupported: boolean;
  newestRelationship: RevisionRelationship;
  candidateRelationships: Record<string, RevisionRelationship>;
}

export type UpdateAvailability =
  | { kind: "current" }
  | { kind: "attention"; reason: string }
  | { kind: "available"; notice: string | null; targets: UpdateTarget[] };

export interface PreparedUpdateSelection {
  target: UpdateTarget;
  binding: {
    projectId: string;
    catalogGeneratedAt: string;
    internalName: string;
    installedSha: string;
    repositoryUrl: string;
    branch: string | null;
    requestedSha: string;
  };
}
```

Derive checked from `project.tavernKeeper.report.scannedSha`, newest from `inspection.newestSha`, include only `behind`, deduplicate equal requested SHAs, reject origin mismatch/dirty/unexpected branch/ahead/diverged, and use the approved already-scanned sentence.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm.cmd test -- tests/unit/update-targets.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the pure domain slice**

```text
feat(updates): derive forward targets
```

---

### Task 2: Explicit Host Inspection and Exact Update Contract

**Files:**
- Modify: `src/host/host-types.ts`
- Modify: `src/host/sillytavern-host.ts`
- Modify: `tests/helpers/fake-host.ts`
- Modify: `tests/unit/host-contract.test.ts`

**Interfaces:**
- Consumes: `HostUpdateInspection` from Task 1.
- Produces on `HostExtensionAdapter`:
  - `inspectUpdate(input: { internalName; type; repositoryUrl; branch; candidateShas }): Promise<HostUpdateInspection>`
  - `applyUpdate(input: { internalName; type; repositoryUrl; branch; expectedCurrentSha; targetSha }): Promise<void>`

- [ ] **Step 1: Write failing adapter tests for status parsing, explicit unsupported behavior, sanitized errors, and exact update payloads**

```ts
await expect(
  host.inspectUpdate({
    internalName: "third-party/Alpha",
    type: "local",
    repositoryUrl,
    branch: "main",
    candidateShas: [checkedSha],
  }),
).resolves.toMatchObject({ installedSha, newestSha, exactUpdateSupported: true });

expect(fetchMock).toHaveBeenCalledWith("/api/extensions/update-status", expect.objectContaining({
  method: "POST",
  body: JSON.stringify({
    extensionName: "Alpha",
    global: false,
    repositoryUrl,
    branch: "main",
    candidateShas: [checkedSha],
  }),
}));

await host.applyUpdate({
  internalName: "third-party/Alpha",
  type: "local",
  repositoryUrl,
  branch: "main",
  expectedCurrentSha: installedSha,
  targetSha: newestSha,
});
expect(fetchMock).toHaveBeenLastCalledWith("/api/extensions/update-to", expect.any(Object));
```

- [ ] **Step 2: Run host tests and verify RED**

Run: `npm.cmd test -- tests/unit/host-contract.test.ts`

Expected: FAIL because the adapter methods are missing.

- [ ] **Step 3: Implement strict non-legacy endpoints**

Parse every SHA with the existing full-hash validator, accept only the four relationship literals, require booleans and strings, and translate 404 from `/api/extensions/update-status` into the safe message `This version of SillyTavern cannot check updates safely.` Do not send exact target fields to legacy `/api/extensions/update`.

`applyUpdate()` posts only to `/api/extensions/update-to` and treats any non-2xx response as a sanitized `HostOperationError("update", "SillyTavern could not update the extension.")`.

- [ ] **Step 4: Extend `FakeHost` with deterministic inspection and update results**

Add `updateInspections`, `updateResults`, `inspectUpdate`, and `applyUpdate` options/calls. `applyUpdate` must compare `expectedCurrentSha`, update the fake installed revision only on a match, and support configured mismatches for coordinator verification tests.

- [ ] **Step 5: Run host and existing lifecycle tests**

Run: `npm.cmd test -- tests/unit/host-contract.test.ts tests/unit/install-lifecycle.test.ts tests/unit/verified-install.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the host contract slice**

```text
feat(host): add exact extension updates
```

---

### Task 3: Session Update Coordinator

**Files:**
- Create: `src/updates/update-coordinator.ts`
- Modify: `src/lifecycle/operation-receipt.ts`
- Modify: `tests/unit/workflow-contract.test.ts`
- Test: `tests/unit/update-coordinator.test.ts`
- Test: `tests/integration/update-scenarios.test.ts`

**Interfaces:**
- Consumes: catalog/inventory getters, `HostExtensionAdapter`, `ProfileStore`, shared `OperationLock`, and trust confirmation callback.
- Produces: `ExtensionUpdateCoordinator` with `read()`, `subscribe()`, `checkAll()`, `check(projectId)`, `prepare(projectId)`, `update(selection)`, and `invalidate()`.

- [ ] **Step 1: Write failing tests for independent checks and bounded concurrency**

Create managed and external inventory entries, delay four fake inspections, call `checkAll()`, and assert at most three are active. Reject one inspection and assert only that project becomes `{ kind: "error" }` while the others become current or available.

- [ ] **Step 2: Write failing tests for prepared-binding staleness, trust prompts, ownership preservation, and exact verification**

```ts
const prepared = coordinator.prepare("alpha");
host.setInstalledRevision("local:third-party/Alpha", otherSha);
await expect(coordinator.update(prepared.targets[0])).rejects.toThrow(
  "This update choice is out of date. Check again.",
);
expect(host.calls.filter(({ operation }) => operation === "applyUpdate")).toHaveLength(0);

await coordinator.update(validExternalSelection);
expect(store.read().managedExtensions.alpha).toBeUndefined();
expect(host.calls).toContainEqual(expect.objectContaining({
  operation: "readLocalRevision",
  internalName: "third-party/Alpha",
}));
```

- [ ] **Step 3: Run coordinator tests and verify RED**

Run: `npm.cmd test -- tests/unit/update-coordinator.test.ts tests/integration/update-scenarios.test.ts`

Expected: FAIL because the coordinator does not exist.

- [ ] **Step 4: Implement the coordinator state machine**

Use these public states:

```ts
export type ProjectUpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "current" }
  | { kind: "available"; notice: string | null; targets: UpdateTarget[] }
  | { kind: "attention"; reason: string }
  | { kind: "error"; reason: "Could not check for updates." };
```

`checkAll()` runs only catalog-matched local managed/external entries with concurrency 3. `update()` runs inside `lock.runExclusive("update:<projectId>")`, re-inspects, validates the immutable binding, calls `selectTrustPrompts`, applies the exact target, rediscovers identity, calls `readLocalRevision`, requires exact equality, creates `kind: "update"` receipt data, updates managed provenance only when a managed record already exists, and rechecks the project.

- [ ] **Step 5: Extend lifecycle receipts without changing install/remove copy**

Allow `kind: "install" | "update" | "remove"`; reuse requested/host-accepted/verified/recorded steps; include selected `installProvenance` for checked/newest update details; set `reloadRequired: true` on successful update.

- [ ] **Step 6: Run coordinator, receipt, and workflow tests**

Run: `npm.cmd test -- tests/unit/update-coordinator.test.ts tests/integration/update-scenarios.test.ts tests/unit/workflow-contract.test.ts tests/unit/receipt-dismissal.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the coordinator slice**

```text
feat(updates): coordinate verified updates
```

---

### Task 4: Installed Page Status, Controls, and Chooser

**Files:**
- Modify: `src/catalog/installed-view-model.ts`
- Modify: `src/catalog/discovery-controller.ts`
- Modify: `src/ui/installed/installed-section.tsx`
- Modify: `src/ui/installed/installed-route.tsx`
- Create: `src/ui/installed/update-version-chooser.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Modify: `src/ui/popup-host.tsx`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/lifecycle.css`
- Modify: `src/styles/responsive.css`
- Test: `tests/unit/installed-route.test.tsx`
- Test: `tests/unit/update-version-chooser.test.tsx`
- Modify: `tests/unit/companion-shell.test.tsx`

**Interfaces:**
- Consumes: coordinator snapshots and prepared selections from Task 3.
- Produces: automatic entry check, Check again, per-card status/Retry/Update, compact confirmation, success receipt wiring, and reload action.

- [ ] **Step 1: Write failing Installed route tests for status text and footer order**

```ts
expect(screen.getByText("Update available")).toBeVisible();
const footerButtons = within(card).getAllByRole("button");
expect(footerButtons.map((button) => button.textContent)).toEqual([
  expect.stringContaining("Enabled"),
  "Update",
  "Uninstall",
]);
expect(screen.queryByRole("button", { name: "Update Current" })).not.toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Retry updates for Broken" }));
expect(onCheckUpdate).toHaveBeenCalledWith("broken");
```

- [ ] **Step 2: Write failing chooser tests for one target, two targets, copy, dismissal, and focus restoration**

Assert the heading `Update Alpha`, target buttons `Latest scanned version` and `Newest version`, the sentence `You already have the latest scanned version.`, Escape/outside dismissal, and restored focus. Confirm a one-target chooser still requires a click.

- [ ] **Step 3: Run UI tests and verify RED**

Run: `npm.cmd test -- tests/unit/installed-route.test.tsx tests/unit/update-version-chooser.test.tsx tests/unit/companion-shell.test.tsx`

Expected: FAIL because update props and chooser are missing.

- [ ] **Step 4: Project update state into installed rows and render lean controls**

Add `updateState` to `InstalledRowViewModel` with `idle` as default. Render status as visible text. Render Retry or Update between the existing toggle and lifecycle control. Keep Uninstall behavior unchanged and use project-specific accessible names.

Add Check again to the Installed toolbar. The initial route effect calls the combined refresh/check handler once. Disable repeated checks during active checking without disabling Uninstall after checks finish.

- [ ] **Step 5: Add the compact chooser using existing overlay geometry**

Reuse `resolveOverlayPortalTarget`, the Install chooser's viewport positioning rules, Escape/outside dismissal, first-target focus, and anchor focus restoration. Copy is:

```text
Update <project name>
Latest scanned version
TavernKeeper checked this version on <date>.
Newest version
The latest version from the creator. It may include changes TavernKeeper hasn't checked yet.
Cancel
```

- [ ] **Step 6: Wire runtime coordinator and reload notice**

Create the update coordinator in `createPopupRuntime()` with the existing prompt broker and lifecycle lock. Subscribe in `CompanionPopupHost`, invalidate on catalog/inventory change, check after Installed refresh, prepare on Update, execute on target selection, publish the receipt, and call `host.reload()` only from **Reload now**.

Update success copy to `Updated to the latest scanned version.` or `Updated to the newest version.` and `Reload to apply updates`. Do not auto-dismiss the reload-required update notice.

- [ ] **Step 7: Run UI and accessibility tests**

Run: `npm.cmd test -- tests/unit/installed-route.test.tsx tests/unit/update-version-chooser.test.tsx tests/unit/companion-shell.test.tsx tests/unit/accessibility.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit the Installed UI slice**

```text
feat(installed): offer extension updates
```

---

### Task 5: Browser Proof, User Documentation, and Full Gates

**Files:**
- Modify: `tests/fixtures/ui-harness-entry.tsx`
- Modify: `tests/e2e/companion.spec.ts` or the current Installed-page Playwright spec
- Modify: `docs/user/browsing-and-installing.md`
- Modify: `docs/user/troubleshooting.md`
- Generated: `dist/extension.js`
- Generated: `dist/companion.css`

**Interfaces:**
- Consumes: completed update feature.
- Produces: responsive interaction proof, user-facing compatibility guidance, and release artifacts.

- [ ] **Step 1: Add browser fixture states and failing interaction coverage**

Cover desktop and mobile cards in checking/current/available/error states; open one- and two-target confirmations; verify Update precedes Uninstall; use keyboard Escape and pointer dismissal; exercise Retry and Reload now; run at 200% text and reduced motion.

- [ ] **Step 2: Run focused browser tests and verify RED, then complete fixture wiring**

Run: `npm.cmd run test:e2e -- --grep "installed updates"`

Expected before fixture wiring: FAIL. Expected after wiring: PASS.

- [ ] **Step 3: Document user behavior and compatibility**

Document automatic checks on opening Installed, Check again, latest scanned versus newest, forward-only behavior, Needs attention handoff, no ownership adoption, and reload reminder. Troubleshooting must say that older SillyTavern versions cannot perform exact scanned updates and must not suggest reset or stash commands.

- [ ] **Step 4: Build and run the complete repository gates**

Run:

```text
npm.cmd run check
npm.cmd run test:e2e
npm.cmd run release:package
npm.cmd run release:verify
```

Expected: all commands exit 0; generated `dist` files and release archive match source.

- [ ] **Step 5: Inspect the final diff for scope and accidental user-file changes**

Run: `git status --short`, `git diff --check`, and `git diff --stat origin/main...HEAD`.

Expected: only update-feature source, tests, docs, and generated release assets are changed; no `.codex-remote-attachments` or unrelated dirty primary-checkout files are included.

- [ ] **Step 6: Commit release artifacts and documentation**

```text
docs: explain installed updates
```

- [ ] **Step 7: Push the verified feature commit range to `origin/main`**

First fetch with GitHub network access, verify `origin/main` is an ancestor of the feature HEAD, integrate any intervening remote commits in the isolated worktree, rerun `npm.cmd run check`, then push the feature branch fast-forward to `main`. Never reset, clean, stash, or modify the dirty primary checkout.
