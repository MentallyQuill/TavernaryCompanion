# Installed Bulk Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build compact selectable Installed Kit cards, individual extension selection, bulk Add to Kit, and verified bulk uninstall with complete desktop, mobile, keyboard, tooltip, and release proof.

**Architecture:** `CompanionPopupHost` owns ephemeral Installed selection because Kit Builder save and bulk-removal completion decide when it clears. Pure selection functions handle union, overlap, explicit Kit-source state, and inventory reconciliation. A focused aggregate-removal module composes the existing verified single-extension lifecycle and produces a fingerprinted preflight plus aggregate receipt without weakening ownership or Kit-state authority.

**Tech Stack:** TypeScript 6, Preact 10, Vitest, Testing Library, Playwright, CSS container queries, existing `Tooltip`, `DialogFrame`, `ProfileStore`, `LifecycleCoordinator`, `KitStore`, and Kit Builder.

**Spec:** `docs/superpowers/specs/2026-08-19-installed-bulk-kit-selection-design.md`

## Global Constraints

- Kit membership never transfers lifecycle ownership.
- Only catalog-matched, individually removable installed extensions are selectable.
- Uncataloged, missing, global, and Companion-self entries retain their current non-bulk management paths.
- Published Kits remain read-only; bulk Add to Kit targets only New Kit or an existing personal Kit.
- Clearing selections exits selection mode; there is no Done or separate Cancel-selection control.
- Bulk removal runs sequentially, revalidates before mutation, verifies each host removal, and never promises rollback.
- Essential meaning remains visible on mobile; hover tooltips are supplementary.
- Generated `dist` files must be built from the reviewed source before publication.
- Preserve concurrent user and remote work; integrate only by current-main rebase or fast-forward and never reset or force-push.

---

### Task 1: Pure Installed selection and eligibility model

**Files:**
- Create: `src/ui/installed/installed-selection.ts`
- Create: `tests/unit/installed-selection.test.ts`
- Modify: `src/catalog/installed-view-model.ts`
- Modify: `tests/unit/project-view-model.test.ts`

**Interfaces:**
- Consumes: canonical project IDs, selectable IDs, and `Readonly<Record<string, readonly string[]>>` Kit membership.
- Produces: `InstalledSelectionState`, `EMPTY_INSTALLED_SELECTION`, `startInstalledSelection`, `toggleInstalledProject`, `selectInstalledKit`, `clearInstalledSelection`, and `reconcileInstalledSelection`.
- Produces: `InstalledRowViewModel.selectionEligible: boolean` and `selectionDisabledReason: string | null`.

- [ ] **Step 1: Write failing selection-state tests**

```ts
it("unions overlapping Kit members and tracks only explicit Kit sources", () => {
  const memberships = { writers: ["alpha", "shared"], tools: ["shared", "beta"] };
  const first = selectInstalledKit(EMPTY_INSTALLED_SELECTION, "writers", memberships.writers);
  const second = selectInstalledKit(first, "tools", memberships.tools);
  expect(second).toEqual({
    active: true,
    projectIds: ["alpha", "shared", "beta"],
    sourceKitIds: ["writers", "tools"],
  });
});

it("drops a Kit source when its selection is refined", () => {
  const selected = selectInstalledKit(EMPTY_INSTALLED_SELECTION, "writers", ["alpha", "beta"]);
  const refined = toggleInstalledProject(selected, "beta");
  expect(
    reconcileInstalledSelection(refined, ["alpha", "beta"], { writers: ["alpha", "beta"] }),
  ).toEqual({ active: true, projectIds: ["alpha"], sourceKitIds: [] });
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/installed-selection.test.ts tests/unit/project-view-model.test.ts`

Expected: FAIL because the selection module and eligibility fields do not exist.

- [ ] **Step 3: Implement the immutable selection functions**

```ts
export interface InstalledSelectionState {
  active: boolean;
  projectIds: string[];
  sourceKitIds: string[];
}

export const EMPTY_INSTALLED_SELECTION: InstalledSelectionState = {
  active: false,
  projectIds: [],
  sourceKitIds: [],
};

export function selectInstalledKit(
  state: InstalledSelectionState,
  kitId: string,
  projectIds: readonly string[],
): InstalledSelectionState {
  if (projectIds.length === 0) return state;
  return {
    active: true,
    projectIds: [...new Set([...state.projectIds, ...projectIds])],
    sourceKitIds: [...new Set([...state.sourceKitIds, kitId])],
  };
}
```

Implement `reconcileInstalledSelection` so it removes unavailable IDs, removes explicit Kit sources whose nonempty current selectable membership is no longer a subset of the selection, and returns `EMPTY_INSTALLED_SELECTION` when no selected projects remain.

- [ ] **Step 4: Mark only direct-removal rows selectable**

Set `selectionEligible` when `row.action.kind === "uninstall"` and the project is not Companion. Give global, uncataloged, missing, and self-protected rows exact disabled explanations.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm.cmd test -- tests/unit/installed-selection.test.ts tests/unit/project-view-model.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the selection domain**

```powershell
git add -- src/ui/installed/installed-selection.ts src/catalog/installed-view-model.ts tests/unit/installed-selection.test.ts tests/unit/project-view-model.test.ts
git commit -m "feat(installed): model bulk selection"
```

### Task 2: Compact Installed Kit cards and selectable extension cards

**Files:**
- Create: `src/ui/installed/installed-kit-card.tsx`
- Create: `src/ui/installed/installed-bulk-bar.tsx`
- Modify: `src/kits/kit-view-model.ts`
- Modify: `src/ui/popup-host.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Modify: `src/ui/installed/installed-route.tsx`
- Modify: `src/ui/installed/installed-section.tsx`
- Modify: `tests/unit/kit-presentation.test.ts`
- Modify: `tests/unit/installed-route.test.tsx`

**Interfaces:**
- Consumes: Task 1 `InstalledSelectionState` and selection functions.
- Produces: `InstalledKitViewModel.totalProjectCount`, `missingProjectIds`, `selectionProjectIds`, `displayStatus`, `statusHelp`, and `active`.
- Produces: `InstalledBulkBar` callbacks `onAddToKit`, `onUninstall`, and `onClear`.
- Produces: controlled `InstalledRoute` selection props passed from `CompanionPopupHost` through `CompanionShell`.

- [ ] **Step 1: Write failing compact-card and route-selection tests**

```tsx
fireEvent.click(screen.getByRole("button", { name: "Select installed extensions" }));
fireEvent.click(screen.getByRole("checkbox", { name: "Select Alpha" }));
expect(screen.getByRole("status")).toHaveTextContent("1 selected");
expect(screen.getByRole("button", { name: "Add selected extensions to a Kit" })).toBeVisible();

fireEvent.click(
  screen.getByRole("button", { name: "Select 2 installed extensions from Writer Kit" }),
);
expect(onSelectKit).toHaveBeenCalledWith("writer-kit");
expect(screen.queryByText("A focused writing stack.")).not.toBeInTheDocument();
expect(screen.getByText("2/3 installed")).toBeVisible();
```

Add presentation cases for Complete, Active, Partial, Drifted, and Missing, including an active Kit with missing members displaying Drifted rather than falsely claiming a clean Active state.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/kit-presentation.test.ts tests/unit/installed-route.test.tsx`

Expected: FAIL because compact view-model fields and selection UI are absent.

- [ ] **Step 3: Derive compact Kit status and selectable membership**

In `buildKitPresentation`, compute the topology count, missing IDs, and selection IDs from installed inventory. Apply status priority `Missing -> Drifted -> Partial -> Active -> Complete`, where an active Kit with missing members is Drifted.

```ts
type InstalledKitDisplayStatus = "Active" | "Partial" | "Drifted" | "Missing" | "Complete";
```

- [ ] **Step 4: Render compact Kit cards**

Make the card body a button with `aria-pressed` driven only by explicit `sourceKitIds`. Keep status help and overflow controls as separate sibling hit targets. Render title, `N/M installed`, operational state, and `Needs review` only for Drifted. Disable selection when `selectionProjectIds` is empty.

- [ ] **Step 5: Render controlled extension selection and bulk bar**

When selection is active, add checkbox-equivalent controls only to eligible cards. Apply `is-selected`, keep normal update/toggle/lifecycle actions operable only when not in selection mode, announce the selected count, and make Clear call the controlled clear callback.

- [ ] **Step 6: Own selection in `CompanionPopupHost` and reconcile refreshes**

Initialize `useState(EMPTY_INSTALLED_SELECTION)`, pass the state and callbacks through `CompanionShell`, and call `reconcileInstalledSelection` after each inventory refresh using current eligible IDs and Kit memberships. Clear on Escape and unmount.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm.cmd test -- tests/unit/installed-selection.test.ts tests/unit/kit-presentation.test.ts tests/unit/installed-route.test.tsx tests/unit/companion-shell.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit compact selection UI**

```powershell
git add -- src/kits/kit-view-model.ts src/ui/popup-host.tsx src/ui/shell/companion-shell.tsx src/ui/installed tests/unit/kit-presentation.test.ts tests/unit/installed-route.test.tsx tests/unit/companion-shell.test.tsx
git commit -m "feat(installed): select extensions by Kit"
```

### Task 3: Bulk Add to Kit handoff

**Files:**
- Create: `src/ui/installed/add-to-kit-dialog.tsx`
- Create: `tests/unit/add-to-kit-dialog.test.tsx`
- Modify: `src/kits/kit-draft.ts`
- Modify: `src/ui/popup-host.tsx`
- Modify: `tests/unit/kit-draft.test.ts`
- Create: `tests/unit/popup-host.test.tsx`

**Interfaces:**
- Consumes: selected canonical project IDs and `KitStore.readDefinitions()`.
- Produces: `addDraftMembers(draft, projectIds)` and `AddToKitDialog` target selection of `{ kind: "new" } | { kind: "existing"; kitId: string }`.
- Produces: Popup Host draft-origin state that clears Installed selection only after a successful Builder save.

- [ ] **Step 1: Write failing draft and target-dialog tests**

```ts
expect(addDraftMembers(createKitDraft(existing), ["beta", "alpha"]).projectIds).toEqual([
  "alpha",
  "beta",
]);
```

```tsx
expect(screen.getByRole("button", { name: "Create a new Kit" })).toBeVisible();
expect(screen.getByRole("button", { name: "Add to Writer Kit" })).toBeVisible();
expect(screen.queryByText("Published Kit")).not.toBeInTheDocument();
expect(screen.getByText("Adding to a Kit does not change extension ownership.")).toBeVisible();
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/kit-draft.test.ts tests/unit/add-to-kit-dialog.test.tsx tests/unit/popup-host.test.tsx`

Expected: FAIL because bulk staging and target selection are absent.

- [ ] **Step 3: Add multi-member draft staging**

Implement `addDraftMembers` as an ordered reduce over `addDraftMember`, preserving existing order, deduplicating IDs, and excluding Companion.

- [ ] **Step 4: Build the target dialog**

Use `DialogFrame`. Show New Kit first, then alphabetized personal Kits, the selected count, ownership microcopy, and Cancel. Return only the typed target; do not mutate Kit state inside the dialog.

- [ ] **Step 5: Integrate the Builder handoff**

On New Kit, stage into `createKitDraft()`. On existing Kit, stage into `createKitDraft(runtime.kits.readDefinition(kitId)!)`. Open the Builder expanded. Preserve selection when the chooser or Builder is canceled. After `saveKitDraft` succeeds for an Installed-origin draft, clear selection and reset the origin marker.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm.cmd test -- tests/unit/kit-draft.test.ts tests/unit/add-to-kit-dialog.test.tsx tests/unit/popup-host.test.tsx tests/unit/kit-editor.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit Add to Kit**

```powershell
git add -- src/kits/kit-draft.ts src/ui/installed/add-to-kit-dialog.tsx src/ui/popup-host.tsx tests/unit/kit-draft.test.ts tests/unit/add-to-kit-dialog.test.tsx tests/unit/popup-host.test.tsx
git commit -m "feat(installed): add selections to Kits"
```

### Task 4: Fingerprinted aggregate removal domain

**Files:**
- Create: `src/lifecycle/bulk-removal.ts`
- Create: `tests/unit/bulk-removal.test.ts`
- Modify: `src/lifecycle/removal-impact.ts`
- Modify: `tests/unit/removal-impact.test.ts`

**Interfaces:**
- Consumes: an object exposing `previewRemoval(projectId)` and `remove(projectId)` with the existing lifecycle signatures.
- Produces: `BulkRemovalPlan`, `BulkRemovalReceipt`, `BulkRemovalPlanChangedError`, `prepareBulkRemoval`, `executeBulkRemoval`, and `parseBulkRemovalReceipt`.

- [ ] **Step 1: Write failing plan and execution tests**

```ts
const plan = await prepareBulkRemoval(lifecycle, ["alpha", "beta", "alpha"]);
expect(plan.projectIds).toEqual(["alpha", "beta"]);
expect(plan.affectedKits).toEqual([{ id: "writers", title: "Writers" }]);

const receipt = await executeBulkRemoval(lifecycle, plan, () => "bulk-1", now);
expect(remove.mock.calls).toEqual([["alpha"], ["beta"]]);
expect(receipt.status).toBe("partial");
expect(receipt.retryableProjectIds).toEqual(["beta"]);
```

Add a stale-plan case in which a second preview differs before execution and assert zero remove calls.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/bulk-removal.test.ts tests/unit/removal-impact.test.ts`

Expected: FAIL because aggregate planning does not exist.

- [ ] **Step 3: Expose stable Kit-impact data**

Export the existing Kit reference projection from `removal-impact.ts` through a named helper rather than duplicating parsing logic.

- [ ] **Step 4: Implement deterministic preflight**

Deduplicate IDs in input order, preview each item, sort affected Kits by title, aggregate active-Kit impact, and create a deterministic fingerprint from project ID, ownership, removable state, Kit IDs, and active impact. The plan is confirmable only when every selected item remains removable.

- [ ] **Step 5: Implement stale rejection and sequential execution**

Reprepare once before mutation and compare fingerprints. Throw `BulkRemovalPlanChangedError` on mismatch. Otherwise call `remove` sequentially, collect every `LifecycleReceipt`, derive `succeeded | partial | failed`, compute retryable surviving IDs, and aggregate `reloadRequired`.

- [ ] **Step 6: Parse persisted aggregate receipts defensively**

Accept only `kind: "bulk-remove"`, valid status, string IDs, result arrays containing remove receipts, and ISO-like timestamp strings. Return `null` for malformed data.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm.cmd test -- tests/unit/bulk-removal.test.ts tests/unit/removal-impact.test.ts tests/unit/remove-lifecycle.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit aggregate removal domain**

```powershell
git add -- src/lifecycle/bulk-removal.ts src/lifecycle/removal-impact.ts tests/unit/bulk-removal.test.ts tests/unit/removal-impact.test.ts
git commit -m "feat(installed): plan verified bulk removal"
```

### Task 5: Bulk-removal preflight, receipt, and Popup Host integration

**Files:**
- Create: `src/ui/lifecycle/bulk-removal-dialog.tsx`
- Create: `src/ui/lifecycle/bulk-removal-receipt.tsx`
- Create: `tests/unit/bulk-removal-ui.test.tsx`
- Modify: `src/ui/popup-host.tsx`
- Modify: `src/ui/lifecycle/operation-tray.tsx`
- Modify: `tests/unit/popup-host.test.tsx`
- Modify: `tests/unit/lifecycle-ui.test.tsx`

**Interfaces:**
- Consumes: Task 4 `BulkRemovalPlan`, `BulkRemovalReceipt`, `prepareBulkRemoval`, and `executeBulkRemoval`.
- Produces: one reviewed confirmation, one aggregate persisted receipt, and retryable selection restoration.

- [ ] **Step 1: Write failing UI tests**

```tsx
expect(screen.getByRole("dialog", { name: "Uninstall 3 extensions" })).toBeVisible();
expect(screen.getByText("Writer Kit will become Partial.")).toBeVisible();
expect(screen.getByText("The active Kit will show drift.")).toBeVisible();
expect(screen.getByText("Installed outside Companion")).toBeVisible();
```

Add receipt assertions for two removed projects, one failed project, reload-required aggregation, and a Retry failed selection action.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/bulk-removal-ui.test.tsx tests/unit/popup-host.test.tsx tests/unit/lifecycle-ui.test.tsx`

Expected: FAIL because the aggregate surfaces are absent.

- [ ] **Step 3: Build preflight and receipt components**

Use `DialogFrame` for preflight. List ownership groups, affected Kits, active drift, and blocked state visibly. Disable confirmation when `plan.confirmable` is false. Render aggregate results by project name and status; do not collapse destructive consequences into tooltips.

- [ ] **Step 4: Integrate preparation and execution**

Track `pendingBulkRemovalPlan`, `preparingBulkRemoval`, and `bulkRemovalReceipt` in `CompanionPopupHost`. Suppress intermediate per-item receipt presentation while execution is active. After completion, persist the aggregate receipt to `ProfileStore.operationReceipt`, refresh inventory once, and either clear selection on success or reconcile it to `retryableProjectIds` on partial/failed completion.

- [ ] **Step 5: Handle stale and canceled operations**

Cancel closes preflight and preserves selection. `BulkRemovalPlanChangedError` closes the stale plan, performs no mutation, refreshes inventory, preserves valid selections, and shows: **Installed state changed. Review the bulk uninstall again.**

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm.cmd test -- tests/unit/bulk-removal.test.ts tests/unit/bulk-removal-ui.test.tsx tests/unit/popup-host.test.tsx tests/unit/lifecycle-ui.test.tsx tests/unit/remove-lifecycle.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit bulk-removal UI**

```powershell
git add -- src/ui/popup-host.tsx src/ui/lifecycle/bulk-removal-dialog.tsx src/ui/lifecycle/bulk-removal-receipt.tsx src/ui/lifecycle/operation-tray.tsx tests/unit/bulk-removal-ui.test.tsx tests/unit/popup-host.test.tsx tests/unit/lifecycle-ui.test.tsx
git commit -m "feat(installed): execute bulk uninstall"
```

### Task 6: Tooltips, touch help, responsive layout, and browser behavior

**Files:**
- Create: `src/ui/installed/installed-status-help.tsx`
- Create: `tests/unit/installed-status-help.test.tsx`
- Create: `tests/e2e/installed-bulk-actions.spec.ts`
- Modify: `src/ui/installed/installed-kit-card.tsx`
- Modify: `src/ui/installed/installed-bulk-bar.tsx`
- Modify: `src/ui/installed/installed-section.tsx`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`
- Modify: `tests/fixtures/ui-harness-entry.tsx`
- Modify: `tests/e2e/installed-cards.spec.ts`
- Modify: `tests/e2e/responsive-conformance.spec.ts`
- Create: `tests/e2e/installed-bulk-actions.spec.ts-snapshots/installed-bulk-selection-1440x960.png`
- Create: `tests/e2e/installed-bulk-actions.spec.ts-snapshots/installed-bulk-selection-390x844.png`

**Interfaces:**
- Consumes: existing `Tooltip` and `resolveOverlayPortalTarget` behavior.
- Produces: pointer/keyboard status tooltips, touch-accessible Kit status help, 44-pixel controls, and sticky safe-area-aware bulk bar.

- [ ] **Step 1: Write failing tooltip/help and browser tests**

Prove exact copy for Active, Partial, Drifted, Missing, Select, Add to Kit, Uninstall, Clear, ownership states, and Kit overflow. In Playwright, click a Kit card and assert extension-card highlighting, union/deduplication, explicit Kit-source highlighting, Clear exit, keyboard selection, and owned-overlay tooltip placement.

```ts
await page.getByRole("button", { name: /Select .* from Writer's Kit/u }).click();
await expect(page.getByRole("status")).toHaveText("2 selected");
await expect(page.locator(".tavernary-companion-installed-card.is-selected")).toHaveCount(2);
await page.getByRole("button", { name: "Clear selection and exit" }).click();
await expect(page.getByRole("status")).toHaveCount(0);
```

- [ ] **Step 2: Run unit and browser tests and verify RED**

Run: `npm.cmd test -- tests/unit/installed-status-help.test.tsx tests/unit/installed-route.test.tsx`

Run: `npx.cmd playwright test tests/e2e/installed-bulk-actions.spec.ts tests/e2e/installed-cards.spec.ts --project=chromium`

Expected: FAIL because help, styling, and harness operations are absent.

- [ ] **Step 3: Implement tooltip and touch-help contract**

Wrap desktop/focus anchors in the existing `Tooltip`. Render the four status definitions in a `DialogFrame` opened by **Kit status help** so touch users receive the same information. Keep status-help and overflow controls outside the Kit selection button.

- [ ] **Step 4: Implement compact and sticky responsive CSS**

Use a compact Kit grid distinct from extension cards, visible selected outlines/checkmarks, `position: sticky` inside the Companion route, bottom padding equal to the bar plus `env(safe-area-inset-bottom)`, 44-pixel mobile targets, 390-pixel single-column extension cards, 200% zoom wrapping, and reduced-motion overrides.

- [ ] **Step 5: Extend the UI harness**

Provide two overlapping installed Kits, managed and external selectable extensions, one Partial Kit, Add-to-Kit targets, successful removals, and one controlled removal failure. Keep existing installed-update scenarios unchanged.

- [ ] **Step 6: Verify browser GREEN and update intentional snapshots**

Run: `npx.cmd playwright test tests/e2e/installed-bulk-actions.spec.ts tests/e2e/installed-cards.spec.ts tests/e2e/responsive-conformance.spec.ts --project=chromium --update-snapshots`

Inspect every changed PNG at 1440x960 and 390x844, then rerun without `--update-snapshots`.

Expected: PASS with no clipped Kit names, obscured cards, inaccessible actions, tooltip escapes, or horizontal overflow.

- [ ] **Step 7: Commit accessibility and responsive behavior**

```powershell
git add -- src/ui/installed src/styles/projects.css src/styles/responsive.css tests/unit/installed-status-help.test.tsx tests/fixtures/ui-harness-entry.tsx tests/e2e/installed-bulk-actions.spec.ts tests/e2e/installed-cards.spec.ts tests/e2e/responsive-conformance.spec.ts tests/e2e/installed-bulk-actions.spec.ts-snapshots/installed-bulk-selection-1440x960.png tests/e2e/installed-bulk-actions.spec.ts-snapshots/installed-bulk-selection-390x844.png
git commit -m "feat(installed): polish bulk selection UX"
```

### Task 7: User documentation, full verification, generated artifacts, and publication

**Files:**
- Modify: `docs/user/kits.md`
- Modify: `docs/user/updating-extensions.md`
- Modify: `docs/user/browsing-and-installing.md`
- Modify: `dist/extension.js`
- Modify: `dist/companion.css`

**Interfaces:**
- Consumes: all prior task behavior.
- Produces: user-facing ownership guidance, reviewed generated bundle, and publishable `main`.

- [ ] **Step 1: Update user documentation**

Document compact Installed Kit selection, individual selection, Clear behavior, New/existing personal Kit targets, unchanged external ownership, Partial/Missing persistence, aggregate uninstall confirmation, and partial-failure receipts.

- [ ] **Step 2: Run focused feature verification**

Run:

```powershell
npm.cmd test -- tests/unit/installed-selection.test.ts tests/unit/installed-route.test.tsx tests/unit/add-to-kit-dialog.test.tsx tests/unit/bulk-removal.test.ts tests/unit/bulk-removal-ui.test.tsx tests/unit/installed-status-help.test.tsx tests/unit/popup-host.test.tsx
npx.cmd playwright test tests/e2e/installed-bulk-actions.spec.ts tests/e2e/installed-cards.spec.ts tests/e2e/responsive-conformance.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 3: Run full source gates**

Run: `npm.cmd run check`

Expected: format, lint, typecheck, all Vitest tests, and build PASS.

- [ ] **Step 4: Run full browser gate**

Run: `npm.cmd run test:e2e`

Expected: all Playwright projects PASS. If an isolated visual rerun diagnoses a flake, rerun the complete gate before publication.

- [ ] **Step 5: Build and verify the release package**

Run:

```powershell
npm.cmd run release:package
npm.cmd run release:verify
git diff --check
git status --short
```

Inspect generated `dist/extension.js` and `dist/companion.css` in the final diff and confirm they contain only source-derived feature changes.

- [ ] **Step 6: Commit documentation and generated artifacts**

```powershell
git add -- docs/user/kits.md docs/user/updating-extensions.md docs/user/browsing-and-installing.md dist/extension.js dist/companion.css
git commit -m "docs: explain installed bulk management"
```

- [ ] **Step 7: Review the complete branch**

Run:

```powershell
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git log --oneline origin/main..HEAD
git status --short
```

Review selection authority, ownership preservation, stale-plan safety, partial receipts, accessibility copy, generated artifacts, and unrelated-file exclusion.

- [ ] **Step 8: Integrate current remote main without rewriting it**

Fetch current `origin/main`. If it advanced, rebase the feature branch onto it, resolve only scoped overlaps, and rerun Tasks 7 Steps 2-5. Push only when the branch is a verified fast-forward of current `origin/main`.

- [ ] **Step 9: Push and verify GitHub**

Push the feature branch tip directly to `origin/main` without force. Use GitHub CLI with network permission to inspect required workflow runs for the exact pushed SHA, watch them to completion, and inspect any failed job logs before reporting completion.
