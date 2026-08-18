# Kit Domain and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement safe, resumable Kit storage, planning, installation, activation, deactivation, and reference-aware removal without touching external extensions.

**Architecture:** `KitStore` owns portable definitions and machine-local installed state separately. `KitPlanner` is pure and emits immutable, reviewable plans from catalog, inventory, ownership, Kit references, and requested intent. `KitExecutor` executes only an approved plan under the global lifecycle lock, verifies host state after each mutation, and commits active identity only after every required member is available.

**Tech Stack:** TypeScript, Vitest, FakeHost, profile store, LifecycleCoordinator services.

**Spec:** `docs/superpowers/specs/2026-08-18-tavernary-companion-design.md`; `docs/design/05-kits.md`; `docs/design/07-v2-kit-submission.md`

## Global Constraints

- Saved, installed, active, incomplete, and drifted are separate states.
- Exactly one Kit may be active; multiple Kits may remain installed.
- Frontends, presets, other-frontend projects, and unavailable projects are context-only.
- External extensions are treated as present context but are never enabled, disabled, removed, or adopted by Kit operations.
- Activating installs missing eligible members sequentially, verifies all requirements, then enables/disables and commits active identity.
- Failed activation leaves the prior active marker and its managed enabled set unchanged.
- Successful partial clones are recorded and reported but not rolled back.
- Uninstall removes only managed members no longer referenced by another installed Kit.
- Companion cannot be a personal Kit member; published Kits treat it as satisfied context.
- One approved Kit operation triggers at most one reload.

---

### Task 1: Define portable Kit documents and machine-local state

**Files:**
- Create: `src/kits/kit-types.ts`
- Create: `src/kits/kit-validation.ts`
- Create: `src/kits/kit-store.ts`
- Modify: `src/state/profile-state.ts`
- Modify: `src/state/state-migrations.ts`
- Test: `tests/unit/kit-validation.test.ts`
- Test: `tests/unit/kit-store.test.ts`

**Interfaces:**
- Consumes: profile state, UUID generator, and clock.
- Produces: `PersonalKitV1`, `InstalledKitStateV1`, `KitStore`, and strict import validation.

- [ ] **Step 1: Write failing portable-document tests**

```ts
const valid: PersonalKitV1 = {
  formatVersion: 1,
  id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
  title: "Writer's Kit",
  description: "Tools for long-form writing.",
  targetFrontend: "sillytavern",
  projectIds: ["sillytavern-sillytavern", "example-alpha", "example-beta"],
  createdAt: "2026-08-18T12:00:00.000Z",
  updatedAt: "2026-08-18T12:00:00.000Z",
  origin: { kind: "local" },
};
expect(parsePersonalKit(valid)).toEqual(valid);
```

Add rejection cases for duplicate project IDs, Companion project ID, empty title, wrong frontend, invalid UUID/date, machine paths, tokens, enabled state, operation receipts, unknown top-level keys, and unsupported format versions.

- [ ] **Step 2: Run focused tests and observe missing-Kit failures**

Run: `npm.cmd test -- tests/unit/kit-validation.test.ts tests/unit/kit-store.test.ts`

Expected: FAIL.

- [ ] **Step 3: Define portable and local records**

```ts
export interface InstalledKitStateV1 {
  kitId: string;
  definitionFingerprint: string;
  installedProjectIds: string[];
  missingProjectIds: string[];
  status: "installed" | "incomplete" | "drifted";
  installedAt: string;
  lastVerifiedAt: string;
}
```

Keep installed/enabled state, folder names, operation history, and host details out of `PersonalKitV1`.

- [ ] **Step 4: Implement strict validation and stable fingerprinting**

Normalize no user-visible text beyond trimming ends. Preserve project order. Compute SHA-256 over canonical JSON containing format version, target frontend, and ordered project IDs; title/description changes do not change install topology fingerprint.

- [ ] **Step 5: Implement serialized KitStore operations**

Provide `create`, `update`, `duplicate`, `copyPublished`, `removeDefinition`, `recordInstalledState`, `setActive`, and `reconcile`. Every mutation runs through ProfileStore's queue and returns a cloned snapshot.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-validation.test.ts tests/unit/kit-store.test.ts tests/unit/state-migrations.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/kits/kit-types.ts src/kits/kit-validation.ts src/kits/kit-store.ts src/state/profile-state.ts src/state/state-migrations.ts tests/unit/kit-validation.test.ts tests/unit/kit-store.test.ts tests/unit/state-migrations.test.ts
git commit -m "feat(kits): persist Kit state"
```

### Task 2: Build the pure Kit planner

**Files:**
- Create: `src/kits/kit-plan.ts`
- Create: `src/kits/kit-planner.ts`
- Create: `src/kits/kit-reference-index.ts`
- Test: `tests/unit/kit-planner.test.ts`
- Test: `tests/unit/kit-reference-index.test.ts`

**Interfaces:**
- Consumes: requested Kit/operation, catalog, inventory, managed registry, installed Kit states, active Kit ID, and trust policy.
- Produces: frozen `KitPlan` with categorized steps and blocking issues.

- [ ] **Step 1: Write failing activation-plan test**

```ts
expect(planKitOperation(input)).toMatchObject({
  operation: "activate",
  kitId: "writers-kit",
  blockingIssues: [],
  install: [{ projectId: "beta" }],
  alreadyManaged: [{ projectId: "alpha" }],
  externalContext: [{ projectId: "gamma" }],
  enable: [{ projectId: "alpha" }, { projectId: "beta" }],
  disable: [{ projectId: "old-only" }],
  reloadRequired: true,
});
```

Add cases for context-only presets/frontend, invalid contract blocking, unavailable required extension blocking, shared members, no previous active Kit, same-Kit no-op activation, published Kit containing Companion, personal Kit containing Companion rejection, and schema incompatibility.

- [ ] **Step 2: Run tests and observe missing-planner failures**

Run: `npm.cmd test -- tests/unit/kit-planner.test.ts tests/unit/kit-reference-index.test.ts`

Expected: FAIL.

- [ ] **Step 3: Define immutable plan categories**

```ts
export interface KitPlan {
  id: string;
  operation: "install" | "activate" | "deactivate" | "uninstall";
  kitId: string;
  catalogGeneratedAt: string;
  inventoryFingerprint: string;
  install: KitProjectStep[];
  enable: KitProjectStep[];
  disable: KitProjectStep[];
  remove: KitProjectStep[];
  alreadyManaged: KitProjectStep[];
  externalContext: KitProjectStep[];
  contextOnly: KitProjectStep[];
  keptForOtherKits: KitProjectStep[];
  warnings: KitWarning[];
  blockingIssues: KitIssue[];
  reloadRequired: boolean;
}
```

- [ ] **Step 4: Implement reference counting**

Build project -> installed Kit IDs from `InstalledKitStateV1.installedProjectIds`. Uninstall removes a managed project only when the target Kit is its final installed reference. The active Kit counts as installed. Definitions that are merely saved do not protect repositories from uninstall.

- [ ] **Step 5: Implement external boundary and warning aggregation**

An installed external member enters `externalContext` and no mutation array. Group all material/immediate warnings by severity and stale state while preserving per-project report URLs. The planner never stores user approval.

- [ ] **Step 6: Freeze and fingerprint plans**

Fingerprint the host inventory, active Kit, installed-Kit references, and catalog generation. The executor rejects a stale plan when any fingerprint input changed after preflight.

- [ ] **Step 7: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-planner.test.ts tests/unit/kit-reference-index.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add -- src/kits/kit-plan.ts src/kits/kit-planner.ts src/kits/kit-reference-index.ts tests/unit/kit-planner.test.ts tests/unit/kit-reference-index.test.ts
git commit -m "feat(kits): plan Kit operations"
```

### Task 3: Execute Kit installation with partial-failure receipts

**Files:**
- Create: `src/kits/kit-executor.ts`
- Create: `src/kits/kit-receipt.ts`
- Create: `src/kits/kit-operation-journal.ts`
- Test: `tests/unit/kit-install-executor.test.ts`
- Test: `tests/unit/kit-operation-journal.test.ts`

**Interfaces:**
- Consumes: approved current `KitPlan`, lifecycle lock, host adapter, inventory reconciler, managed registry, KitStore, trust approvals, and clock.
- Produces: `execute(plan, approval): Promise<KitReceipt>` and resumable operation journal.

- [ ] **Step 1: Write failing sequential-install test**

```ts
const receipt = await executor.execute(plan, approval);
expect(host.calls.filter(({ type }) => type === "install").map(({ projectId }) => projectId))
  .toEqual(["alpha", "beta"]);
expect(receipt.projects).toEqual([
  expect.objectContaining({ projectId: "alpha", status: "verified" }),
  expect.objectContaining({ projectId: "beta", status: "failed" }),
]);
expect(kitStore.readInstalled(plan.kitId)?.status).toBe("incomplete");
```

Add tests for continuing safe independent installs after one failure, no rollback of verified clones, ownership only for verified clones, cancel before first mutation, stale plan rejection, and receipt persistence after popup close.

- [ ] **Step 2: Run tests and observe missing-executor failures**

Run: `npm.cmd test -- tests/unit/kit-install-executor.test.ts tests/unit/kit-operation-journal.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement durable journal phases**

Journal fields are operation/plan IDs, phase, started time, current project ID, completed project results, and pre-operation active Kit ID. Persist before the first mutation and after each verified project. No repository URL or error payload is stored.

- [ ] **Step 4: Implement sequential installation**

For each install step: revalidate self/contract, invoke host install, rediscover, verify exact identity, record ownership, and append result. Continue to the next install when the failure is isolated. After the loop, rediscover all required members and record installed/incomplete Kit state.

- [ ] **Step 5: Implement startup recovery**

If a journal exists on bootstrap, do not replay mutations. Rediscover host state, rebuild per-project results, preserve prior active identity, write an interrupted receipt, update Kit completeness, and clear the journal only after persistence succeeds.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-install-executor.test.ts tests/unit/kit-operation-journal.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/kits/kit-executor.ts src/kits/kit-receipt.ts src/kits/kit-operation-journal.ts tests/unit/kit-install-executor.test.ts tests/unit/kit-operation-journal.test.ts
git commit -m "feat(kits): execute Kit installs"
```

### Task 4: Implement staged activation and switching

**Files:**
- Modify: `src/kits/kit-executor.ts`
- Create: `src/kits/kit-activation-commit.ts`
- Test: `tests/unit/kit-activation-executor.test.ts`

**Interfaces:**
- Consumes: activation plan and successful required-member availability check.
- Produces: verified enabled/disabled state, active Kit identity, and at most one reload.

- [ ] **Step 1: Write failing commit-point test**

Prove a failed required installation results in zero enable/disable calls and preserves the previous active Kit. Prove a successful plan calls installs, one full rediscovery, enables requested managed members, disables prior-exclusive managed members, verifies state, commits active identity, then reloads once.

- [ ] **Step 2: Run the focused test and observe missing-activation failure**

Run: `npm.cmd test -- tests/unit/kit-activation-executor.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the activation barrier**

After installs, rediscover every required actionable member. If any is absent or ambiguous, stop before enable/disable. External context may satisfy presence but remains excluded from both mutation lists.

- [ ] **Step 4: Implement ordered commit phases**

Enable requested managed members first, then disable prior-exclusive managed members, each with host reload suppressed. Rediscover enabled state. Only after verification persist active Kit identity and statuses. On enable/disable failure, attempt no inverse mutations; retain the prior active marker, mark both affected Kits drifted, and report actual discovered state.

- [ ] **Step 5: Enforce one reload**

Call `host.reload()` once only after profile persistence and only when at least one installed/enabled/disabled mutation requires it. Tests assert reload count is zero on pre-commit failure and one on success.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-activation-executor.test.ts tests/unit/kit-install-executor.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/kits/kit-executor.ts src/kits/kit-activation-commit.ts tests/unit/kit-activation-executor.test.ts
git commit -m "feat(kits): activate managed profiles"
```

### Task 5: Implement deactivation and reference-safe uninstall

**Files:**
- Modify: `src/kits/kit-executor.ts`
- Modify: `src/kits/kit-planner.ts`
- Test: `tests/unit/kit-deactivate-executor.test.ts`
- Test: `tests/unit/kit-uninstall-executor.test.ts`

**Interfaces:**
- Consumes: deactivation/uninstall plans and reference index.
- Produces: disabled retained repositories or verified removal of final-reference managed members.

- [ ] **Step 1: Write failing shared-member uninstall tests**

Prove uninstall of Kit A keeps an extension referenced by installed Kit B, reports it under `keptForOtherKits`, removes final-reference managed extensions only, never removes external context, and combines deactivation when Kit A is active.

- [ ] **Step 2: Run tests and observe missing-operation failures**

Run: `npm.cmd test -- tests/unit/kit-deactivate-executor.test.ts tests/unit/kit-uninstall-executor.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement deactivation**

Disable target Kit managed members not required by another applicable active state, verify, clear active identity, retain the installed Kit record, and reload at most once. A partial disable marks drift and reports actual state.

- [ ] **Step 4: Implement uninstall**

If active, perform deactivation phase first. Remove each planned final-reference managed member sequentially, rediscover after each, clear ownership only on verified absence, and preserve shared/external members. Remove installed Kit state only when all required removals verify; otherwise mark incomplete with retryable remaining steps.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-deactivate-executor.test.ts tests/unit/kit-uninstall-executor.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/kits/kit-executor.ts src/kits/kit-planner.ts tests/unit/kit-deactivate-executor.test.ts tests/unit/kit-uninstall-executor.test.ts
git commit -m "feat(kits): remove Kits safely"
```

### Task 6: Reconcile drift and changed published Kits

**Files:**
- Create: `src/kits/kit-reconciler.ts`
- Modify: `src/kits/kit-store.ts`
- Test: `tests/unit/kit-reconciler.test.ts`

**Interfaces:**
- Consumes: current catalog definitions, personal definitions, installed state fingerprints, inventory, and active Kit.
- Produces: statuses `saved`, `installed`, `active`, `incomplete`, `drifted`, and `changedOnTavernary` without automatic mutation.

- [ ] **Step 1: Write failing reconciliation tests**

Add cases for a manually disabled managed member, deleted managed member, newly changed published definition, removed catalog project, externally installed requirement, and a clean active Kit.

- [ ] **Step 2: Run test and observe missing-reconciler failure**

Run: `npm.cmd test -- tests/unit/kit-reconciler.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement read-only reconciliation**

Compare installed topology fingerprint to current definition, expected managed enabled state to host discovery, and required availability to inventory. Never install, enable, disable, remove, or rewrite a personal definition during reconciliation.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd test -- tests/unit/kit-reconciler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/kits/kit-reconciler.ts src/kits/kit-store.ts tests/unit/kit-reconciler.test.ts
git commit -m "feat(kits): reconcile Kit drift"
```

## Phase exit gate

Run:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- tests/unit/kit-validation.test.ts tests/unit/kit-store.test.ts tests/unit/kit-planner.test.ts tests/unit/kit-reference-index.test.ts tests/unit/kit-install-executor.test.ts tests/unit/kit-activation-executor.test.ts tests/unit/kit-deactivate-executor.test.ts tests/unit/kit-uninstall-executor.test.ts tests/unit/kit-operation-journal.test.ts tests/unit/kit-reconciler.test.ts
npm.cmd run build
```

Record host call order, operation/reload counts, previous-active preservation evidence, partial-clone evidence, shared-member reference evidence, external-boundary evidence, and recovery-after-interruption evidence in the roadmap.
