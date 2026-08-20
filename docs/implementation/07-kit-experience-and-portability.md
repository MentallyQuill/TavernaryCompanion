# Kit Experience and Portability Implementation Plan

> **Historical plan:** This file records the originally delivered V1 scope. The current release
> decision supersedes its **New Kit** toolbar and import steps: creation now starts from the Kit
> Builder rail or Projects/Installed selection, Kit import is not exposed, and export remains.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete V1 Kit browsing, creation, editing, switching, import, export, and recovery experience over the verified Kit domain services.

**Architecture:** UI-specific Kit view models join published CatalogCore results with local Kit definitions and reconciled operational state. Editors modify drafts only; saving passes through strict Kit validation. Every mutation begins from a rendered immutable preflight plan and routes to `KitExecutor`, while import/export touches only portable definitions.

**Tech Stack:** Preact, TypeScript, CatalogCore Kit selectors, Testing Library, Playwright, browser File/Blob APIs.

**Spec:** `docs/design/05-kits.md`; `docs/design/07-v2-kit-submission.md`; `docs/design/02-responsive-shell-and-visual-system.md`

## Global Constraints

- Published Tavernary Kits are read-only; users may copy them to editable personal Kits.
- Personal Kits are profile-local and portable JSON import/export is supported.
- V1 contains no Submit to Tavernary UI, GitHub handoff, authentication, or dormant submission transport.
- New personal Kits target SillyTavern and show SillyTavern as fixed frontend context.
- Companion cannot be added to personal Kits and imports containing it are rejected.
- Saved, installed, active, incomplete, drifted, and Changed on Tavernary remain visibly distinct.
- Every Kit operation shows a reviewable preflight before mutation.
- Consolidated concern warnings list every affected project and require explicit Install anyway.
- Closing the overlay does not lose active progress or the final receipt.

---

### Task 1: Build Kit browse and inspector view models

**Files:**
- Create: `src/kits/kit-view-model.ts`
- Create: `src/kits/kit-discovery-controller.ts`
- Test: `tests/unit/kit-view-model.test.ts`
- Test: `tests/unit/kit-discovery-controller.test.ts`

**Interfaces:**
- Consumes: CatalogCore Kit selection, personal Kit index, catalog projects, installed Kit state, reconciled status, and inventory.
- Produces: `KitCardViewModel`, `KitInspectorViewModel`, counts, badges, and state-aware primary actions.

- [ ] **Step 1: Write failing state/action tests**

```ts
expect(toKitCardViewModel(activeKit, context)).toMatchObject({
  originLabel: "Personal Kit",
  operationalStatus: "Active",
  primaryAction: { kind: "deactivate", label: "Deactivate" },
});
```

Add cases for saved-only -> Install Kit, installed inactive -> Activate, incomplete -> Retry, drifted -> Review, published uninstalled -> Install Kit, changed published definition -> Review changes, and unavailable-only Kit -> View Kit.

- [ ] **Step 2: Run tests and observe missing-view-model failures**

Run: `npm.cmd test -- tests/unit/kit-view-model.test.ts tests/unit/kit-discovery-controller.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement local and published indexing**

Published Kits use CatalogCore search/filter/sort. Personal Kits use a local normalized index over title, description, target frontend, project names, purposes, and model families available from current catalog records. Never merge identities merely because titles match.

- [ ] **Step 4: Implement inspector groupings**

Group components as `Managed/actionable extensions`, `External extensions`, `Context-only projects`, and `Unavailable or changed`. Include per-member installed/enabled/ownership, assessment, availability, and links without using these groups as mutation authority.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-view-model.test.ts tests/unit/kit-discovery-controller.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/kits/kit-view-model.ts src/kits/kit-discovery-controller.ts tests/unit/kit-view-model.test.ts tests/unit/kit-discovery-controller.test.ts
git commit -m "feat(kits): build Kit view models"
```

### Task 2: Implement Kits route and inspector

**Files:**
- Create: `src/ui/kits/kits-route.tsx`
- Create: `src/ui/kits/kit-card.tsx`
- Create: `src/ui/kits/kit-inspector.tsx`
- Create: `src/ui/kits/kit-component-group.tsx`
- Create: `src/ui/kits/kit-filter-panel.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Test: `tests/unit/kits-route.test.tsx`
- Test: `tests/unit/kit-inspector.test.tsx`

**Interfaces:**
- Consumes: Kit discovery snapshots and shell intents.
- Produces: published/personal segmentation, shared filter controls, Kit cards, and nested inspector navigation.

- [ ] **Step 1: Write failing route tests**

Prove Published and Personal segments are reachable, counts update, CatalogCore Kit filters render, cards show origin/component/installable/flagged/status information, and Back restores card focus and scroll.

- [ ] **Step 2: Run tests and observe missing-route failures**

Run: `npm.cmd test -- tests/unit/kits-route.test.tsx tests/unit/kit-inspector.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement responsive route and cards**

Use the shell's rail/sheet breakpoint behavior. Cards render one primary action and an overflow menu for secondary personal-definition actions. On mobile, keep the action visible without opening the inspector.

- [ ] **Step 4: Implement inspector**

Render description/origin/status, grouped components, preflight-triggering actions, and `Copy to Personal Kits` for published definitions. Changed published Kits show old installed topology beside current published topology without automatic mutation.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/kits-route.test.tsx tests/unit/kit-inspector.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/ui/kits src/ui/shell/companion-shell.tsx tests/unit/kits-route.test.tsx tests/unit/kit-inspector.test.tsx
git commit -m "feat(ui): add Kit browsing"
```

### Task 3: Implement personal Kit creation and editing

**Files:**
- Create: `src/kits/kit-draft.ts`
- Create: `src/ui/kits/kit-editor.tsx`
- Create: `src/ui/kits/kit-member-picker.tsx`
- Create: `src/ui/kits/kit-selection-dock.tsx`
- Create: `src/ui/kits/kit-member-row.tsx`
- Modify: `src/ui/projects/project-card.tsx`
- Test: `tests/unit/kit-draft.test.ts`
- Test: `tests/unit/kit-editor.test.tsx`

**Interfaces:**
- Consumes: catalog search, installed inventory, saved/published source definition, and KitStore.
- Produces: validated draft create/update/duplicate/copy operations with ordered canonical project IDs.

- [ ] **Step 1: Write failing create-flow tests**

Prove New Kit asks for title/optional description, shows fixed SillyTavern context, adds eligible extensions from search and Installed, preserves user order, separates context-only members, prevents Companion selection, and enables Save only after validation.

- [ ] **Step 2: Run tests and observe missing-editor failures**

Run: `npm.cmd test -- tests/unit/kit-draft.test.ts tests/unit/kit-editor.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement draft state**

Draft fields are title, description, target frontend, ordered project IDs, source identity, dirty flag, and validation issues. Selection uses canonical IDs; removing/reordering does not mutate the catalog. Closing a dirty editor requires Discard/Continue editing.

- [ ] **Step 4: Implement member selection surfaces**

Project cards expose `Add to Kit` only while a draft selection dock is active and never for Companion. The member picker defaults to eligible SillyTavern extensions but may preserve context-only projects in copied/imported definitions. Reorder buttons and keyboard commands are available in addition to pointer drag.

- [ ] **Step 5: Implement copy and duplicate semantics**

Copying a published Kit creates a new local UUID, editable title, origin `{ kind: "published-copy", tavernaryKitId }`, preserved member order, and new timestamps. Duplicating personal does the same with origin `{ kind: "local" }`; neither copies installed/active state.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-draft.test.ts tests/unit/kit-editor.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/kits/kit-draft.ts src/ui/kits/kit-editor.tsx src/ui/kits/kit-member-picker.tsx src/ui/kits/kit-selection-dock.tsx src/ui/kits/kit-member-row.tsx src/ui/projects/project-card.tsx tests/unit/kit-draft.test.ts tests/unit/kit-editor.test.tsx
git commit -m "feat(kits): add personal Kit editor"
```

### Task 4: Implement Kit preflight and consolidated warnings

**Files:**
- Create: `src/ui/kits/kit-preflight-dialog.tsx`
- Create: `src/ui/kits/kit-warning-group.tsx`
- Create: `src/ui/kits/kit-impact-summary.tsx`
- Test: `tests/unit/kit-preflight-ui.test.tsx`

**Interfaces:**
- Consumes: immutable `KitPlan` and approval callback.
- Produces: categorized operation review, report links, Cancel, and state-specific confirm action.

- [ ] **Step 1: Write failing preflight tests**

Prove an activation displays installs/enables/disables/already installed/external/context/shared groups; blocking issues disable confirmation; material/immediate projects appear in one warning section; every report opens independently; and confirmation text is `Install anyway` whenever concern warnings exist.

- [ ] **Step 2: Run test and observe missing-preflight failure**

Run: `npm.cmd test -- tests/unit/kit-preflight-ui.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement plan-bound approval**

Approval returns `{ planId, inventoryFingerprint, catalogGeneratedAt, acceptedWarningProjectIds }`. The executor rejects any mismatch or missing warned project. Reviewing a report preserves the same pending dialog and approval state remains false.

- [ ] **Step 4: Implement operation-specific copy**

Use `Install Kit`, `Activate Kit`, `Deactivate Kit`, and `Uninstall Kit` labels. Activation summary says `Managed Kit activated`, never that the entire extension environment exactly matches the Kit, because external extensions remain untouched.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-preflight-ui.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/ui/kits/kit-preflight-dialog.tsx src/ui/kits/kit-warning-group.tsx src/ui/kits/kit-impact-summary.tsx tests/unit/kit-preflight-ui.test.tsx
git commit -m "feat(ui): add Kit preflight"
```

### Task 5: Implement Kit progress, results, and fast switching

**Files:**
- Create: `src/ui/kits/kit-operation-tray.tsx`
- Create: `src/ui/kits/kit-receipt.tsx`
- Create: `src/ui/kits/kit-switcher.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Test: `tests/unit/kit-operation-ui.test.tsx`
- Test: `tests/e2e/kit-switching.spec.ts`

**Interfaces:**
- Consumes: executor journal/receipt, installed Kit list, active Kit ID, and plan/execute intents.
- Produces: durable progress, per-project outcome, retry entry point, and one-action installed Kit activation.

- [ ] **Step 1: Write failing progress and failure tests**

Prove sequential project progress is announced, closing/reopening restores progress, failed activation names the still-active prior Kit, partial clones appear as installed but inactive, retry creates a fresh plan, and shared kept members appear in uninstall results.

- [ ] **Step 2: Run focused tests and observe missing-operation UI failure**

Run: `npm.cmd test -- tests/unit/kit-operation-ui.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement progress and receipt surfaces**

Keep the compact tray visible across routes. The expanded receipt lists every project with planned action, host result, verified state, and retry eligibility. Dismiss clears only the receipt, never installed state or the operation journal before domain recovery completes.

- [ ] **Step 4: Implement fast switcher**

Installed inactive Kits expose Activate. Selecting it opens a compact difference preflight; no-op activation reports `Already active` without host calls. Do not add a global environment snapshot or disable external extensions.

- [ ] **Step 5: Run unit and browser tests**

Run: `npm.cmd test -- tests/unit/kit-operation-ui.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/kit-switching.spec.ts`

Expected: PASS for success, install failure, enable failure, popup interruption, shared uninstall, and mobile interaction.

- [ ] **Step 6: Commit**

```powershell
git add -- src/ui/kits/kit-operation-tray.tsx src/ui/kits/kit-receipt.tsx src/ui/kits/kit-switcher.tsx src/ui/shell/companion-shell.tsx tests/unit/kit-operation-ui.test.tsx tests/e2e/kit-switching.spec.ts
git commit -m "feat(ui): add Kit switching"
```

### Task 6: Implement strict JSON import and export

**Files:**
- Create: `src/kits/kit-portability.ts`
- Create: `src/ui/kits/kit-import-dialog.tsx`
- Create: `src/ui/kits/kit-export-action.ts`
- Test: `tests/unit/kit-portability.test.ts`
- Test: `tests/unit/kit-import-ui.test.tsx`

**Interfaces:**
- Consumes: `PersonalKitV1`, File text, KitStore, Blob download API.
- Produces: deterministic portable JSON and imported local Kit definitions.

- [ ] **Step 1: Write failing round-trip and rejection tests**

Prove export/import preserves title, description, frontend, ordered IDs, timestamps, and origin; excludes installed/active/managed/receipt/host data; rejects Companion, duplicate IDs, unsupported version, unknown keys, more than 1 MiB, invalid UTF-8/JSON, and duplicate local UUID collision without overwrite.

- [ ] **Step 2: Run tests and observe missing-portability failures**

Run: `npm.cmd test -- tests/unit/kit-portability.test.ts tests/unit/kit-import-ui.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic export**

Serialize a validated clone with two-space indentation, LF ending, `application/json`, and a slugged filename such as `writers-kit.tavernary-kit.json`. Never serialize the profile-state wrapper.

- [ ] **Step 4: Implement preview-before-import**

Parse and validate before any write. Show title, origin, member count, available/actionable/context/unavailable counts, and validation errors. Confirming creates a new UUID if the imported UUID already exists and records origin `{ kind: "imported", sourceId: importedId }`.

- [ ] **Step 5: Assert V2 boundaries**

Add a source test that no V1 component contains `Submit to Tavernary`, `GitHubSubmissionHandoff`, issue-form URLs, GitHub tokens, or submission transport modules. The portable fields remain sufficient for the future projection documented in the V2 design.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-portability.test.ts tests/unit/kit-import-ui.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/kits/kit-portability.ts src/ui/kits/kit-import-dialog.tsx src/ui/kits/kit-export-action.ts tests/unit/kit-portability.test.ts tests/unit/kit-import-ui.test.tsx
git commit -m "feat(kits): add portable Kit files"
```

## Phase exit gate

Run:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- tests/e2e/kit-switching.spec.ts tests/e2e/shell-responsive.spec.ts tests/e2e/shell-accessibility.spec.ts
```

Record create/edit/copy/import/export round-trip evidence, every Kit status rendering, consolidated warning behavior, prior-active failure behavior, popup interruption recovery, mobile Kit interaction, and proof that no V2 submission surface ships.
