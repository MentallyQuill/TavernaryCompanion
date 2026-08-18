# Project Lifecycle and Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide verified one-click installation and removal with explicit ownership, mandatory TavernKeeper concern warnings, durable receipts, and service-level self-protection.

**Architecture:** `LifecyclePolicy` validates identity, install contracts, catalog compatibility, trust requirements, and self-protection before any mutation. `LifecycleCoordinator` serializes operations, executes through `HostExtensionAdapter`, rediscovers authoritative state, and commits ownership/receipts only from verified outcomes. UI dialogs display policy-produced decisions and never weaken them.

**Tech Stack:** TypeScript, Vitest, Preact Testing Library, FakeHost, profile store.

**Spec:** `docs/superpowers/specs/2026-08-18-tavernary-companion-design.md`; `docs/design/04-project-lifecycle-and-trust.md`

## Global Constraints

- Only schema-7 eligible SillyTavern extensions may install or uninstall from a catalog card.
- Companion canonical project ID is `mentallyquill-tavernary-companion` and all its lifecycle operations fail closed.
- First third-party install per profile requires the unsandboxed-code disclosure.
- Every install attempt for Material concern or Immediate danger requires a fresh warning.
- Stale concern warnings use `latest available assessment` and explicitly say the assessment covers an older project version.
- Reviewing an assessment does not count as accepting installation.
- Managed ownership is recorded only after successful host rediscovery.
- Direct individual removal may remove an external installation because the user selected that exact project.
- Kit-driven operations never mutate external installations.
- At most one lifecycle operation runs at a time.

---

### Task 1: Implement install-contract and lifecycle policy

**Files:**
- Create: `src/lifecycle/lifecycle-policy.ts`
- Create: `src/lifecycle/lifecycle-types.ts`
- Create: `src/lifecycle/self-protection.ts`
- Test: `tests/unit/lifecycle-policy.test.ts`
- Test: `tests/unit/self-protection.test.ts`

**Interfaces:**
- Consumes: catalog state, project, inventory match, profile trust state, and operation kind.
- Produces: `LifecycleDecision = allowed | confirmation-required | rejected` with exact reason codes and warning model.

- [ ] **Step 1: Write failing eligibility tests**

```ts
expect(evaluateLifecycle({ operation: "install", project: companionProject, context }))
  .toEqual({ kind: "rejected", reason: "self-protected" });

expect(evaluateLifecycle({ operation: "install", project: presetProject, context }))
  .toEqual({ kind: "rejected", reason: "browse-only-project" });
```

Add cases for schema mismatch, missing/invalid contract, absent project, already-installed state, not-installed uninstall, global non-removable host state, and an eligible low-concern extension.

- [ ] **Step 2: Run tests and observe missing-policy failures**

Run: `npm.cmd test -- tests/unit/lifecycle-policy.test.ts tests/unit/self-protection.test.ts`

Expected: FAIL.

- [ ] **Step 3: Define decisions and rejection codes**

```ts
export type LifecycleRejection =
  | "self-protected"
  | "catalog-incompatible"
  | "browse-only-project"
  | "invalid-install-contract"
  | "already-installed"
  | "not-installed"
  | "host-non-removable"
  | "operation-in-progress";
```

Return user copy keys separately from codes so tests can assert policy without coupling every domain test to markup.

- [ ] **Step 4: Revalidate the install contract at the policy boundary**

Call CatalogCore's `parseInstallContract` again immediately before an allowed install decision. Compare `folderName` to the selected canonical project and reject any unexpected field, URL credential, branch shape, or path.

- [ ] **Step 5: Enforce self-protection in every entry point**

Export `assertNotCompanionProject(projectId)` and call it from install, remove, enable, disable, managed-registry writes, Kit validation, Kit planning, and imported-state normalization. Tests invoke the service functions directly rather than only checking buttons.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/lifecycle-policy.test.ts tests/unit/self-protection.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/lifecycle/lifecycle-policy.ts src/lifecycle/lifecycle-types.ts src/lifecycle/self-protection.ts tests/unit/lifecycle-policy.test.ts tests/unit/self-protection.test.ts
git commit -m "feat(lifecycle): enforce project policy"
```

### Task 2: Implement trust and TavernKeeper warning selection

**Files:**
- Create: `src/trust/trust-policy.ts`
- Create: `src/trust/trust-copy.ts`
- Create: `src/trust/trust-types.ts`
- Test: `tests/unit/trust-policy.test.ts`

**Interfaces:**
- Consumes: profile acknowledgement, TavernKeeper card status, assessment freshness, and project/report URLs.
- Produces: ordered `TrustPrompt[]` for disclosure and concern warning.

- [ ] **Step 1: Write failing prompt-selection tests**

```ts
expect(selectTrustPrompts({
  trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
  assessment: { concern: "material", freshness: "current", reportUrl },
})).toEqual([{ kind: "assessment-warning", severity: "material", stale: false, reportUrl }]);
```

Add cases proving disclosure appears first when unacknowledged, no assessment warning for low/neutral/unscanned states, every material/immediate attempt warns even after previous acceptance, stale wording changes, and missing report URL leaves Review assessment disabled with explanatory text but does not remove Cancel.

- [ ] **Step 2: Run test and observe missing-trust failures**

Run: `npm.cmd test -- tests/unit/trust-policy.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement exact approved warning copy**

```ts
export const CURRENT_ASSESSMENT_WARNING =
  "TavernKeeper's latest assessment identified potential security concerns in this project. Extensions can run code inside SillyTavern. You are responsible for deciding whether to trust and install this project. Review the TavernKeeper assessment and the project before continuing.";

export const STALE_ASSESSMENT_WARNING =
  "TavernKeeper's latest available assessment identified potential security concerns in this project. Extensions can run code inside SillyTavern. You are responsible for deciding whether to trust and install this project. Review the TavernKeeper assessment and the project before continuing. This assessment covers an older version of the project.";
```

- [ ] **Step 4: Implement the one-time disclosure model**

The disclosure states that third-party extensions run unsandboxed code inside SillyTavern, Companion installs from the validated Tavernary contract, TavernKeeper is evidence rather than a guarantee, and the user remains responsible for trust. Acceptance persists `trustAcknowledgedAt`; cancellation persists nothing.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/trust-policy.test.ts`

Expected: PASS with exact copy assertions.

- [ ] **Step 6: Commit**

```powershell
git add -- src/trust tests/unit/trust-policy.test.ts
git commit -m "feat(trust): add install warnings"
```

### Task 3: Implement serialized install and verified ownership

**Files:**
- Create: `src/lifecycle/lifecycle-coordinator.ts`
- Create: `src/lifecycle/operation-lock.ts`
- Create: `src/lifecycle/operation-receipt.ts`
- Test: `tests/unit/install-lifecycle.test.ts`
- Test: `tests/unit/operation-lock.test.ts`

**Interfaces:**
- Consumes: allowed policy decision, approved trust prompts, host adapter, profile store, inventory reconciler, and clock.
- Produces: `install(projectId): Promise<LifecycleReceipt>` and one observable active operation.

- [ ] **Step 1: Write the failing successful-install test**

```ts
const receipt = await coordinator.install("alpha");
expect(host.calls).toEqual([
  { type: "discover" },
  { type: "install", repositoryUrl: "https://github.com/example/alpha.git", branch: null },
  { type: "discover" },
]);
expect(receipt.status).toBe("succeeded");
expect(store.read().managedExtensions.alpha).toMatchObject({ folderName: "alpha" });
```

Add cases for host rejection, endpoint success without rediscovered folder, wrong folder identity, concurrent second request, cancellation before host call, and profile write failure after verified installation.

- [ ] **Step 2: Run tests and observe missing-coordinator failures**

Run: `npm.cmd test -- tests/unit/install-lifecycle.test.ts tests/unit/operation-lock.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement a non-reentrant operation lock**

`runExclusive(operationId, callback)` rejects while occupied, publishes active phase, and clears in `finally`. It does not queue an accidental double click; KitExecutor later owns deliberate sequential queues.

- [ ] **Step 4: Implement install phases**

Run policy, host discovery, prompt callback, install, rediscovery, exact identity verification, then one profile update that writes managed ownership and receipt. On verification failure, do not write ownership. A successful clone with failed profile persistence produces `installed-unrecorded` and directs the user to reopen Companion for reconciliation.

- [ ] **Step 5: Implement receipts**

Receipt fields are `id`, `kind`, `projectId`, `projectName`, `startedAt`, `finishedAt`, `status`, `steps`, `safeError`, and `reloadRequired`. Never include request headers, response dumps, tokens, or full catalog records.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/install-lifecycle.test.ts tests/unit/operation-lock.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/lifecycle/lifecycle-coordinator.ts src/lifecycle/operation-lock.ts src/lifecycle/operation-receipt.ts tests/unit/install-lifecycle.test.ts tests/unit/operation-lock.test.ts
git commit -m "feat(lifecycle): install verified projects"
```

### Task 4: Implement direct removal and Kit-impact reconciliation

**Files:**
- Modify: `src/lifecycle/lifecycle-coordinator.ts`
- Create: `src/lifecycle/removal-impact.ts`
- Test: `tests/unit/remove-lifecycle.test.ts`
- Test: `tests/unit/removal-impact.test.ts`

**Interfaces:**
- Consumes: exact installed project identity, ownership state, installed/active Kit references, and host removability.
- Produces: `previewRemoval(projectId): RemovalImpact` and `remove(projectId): Promise<LifecycleReceipt>`.

- [ ] **Step 1: Write failing managed and external removal tests**

Prove managed removal clears ownership after rediscovery, external removal invokes the exact matched internal name without creating ownership, affected installed Kits become incomplete, active Kit identity remains but carries drift status, and unknown installed extensions cannot enter direct removal through guessed identity.

- [ ] **Step 2: Run tests and observe missing-removal failures**

Run: `npm.cmd test -- tests/unit/remove-lifecycle.test.ts tests/unit/removal-impact.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement removal preview**

Return ownership label, installed Kit references, active Kit impact, global/non-removable state, and the exact confirmation sentence. TavernKeeper concern does not affect removal prompts.

- [ ] **Step 4: Implement verified removal**

Call host removal, rediscover, require the exact internal identity to be absent, then atomically remove ownership, update installed Kit completeness, and persist the receipt. Endpoint failure or continued discovery produces failure without optimistic state changes.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/remove-lifecycle.test.ts tests/unit/removal-impact.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/lifecycle/lifecycle-coordinator.ts src/lifecycle/removal-impact.ts tests/unit/remove-lifecycle.test.ts tests/unit/removal-impact.test.ts
git commit -m "feat(lifecycle): remove exact projects"
```

### Task 5: Implement trust dialogs, progress, and receipts UI

**Files:**
- Create: `src/ui/lifecycle/trust-disclosure-dialog.tsx`
- Create: `src/ui/lifecycle/assessment-warning-dialog.tsx`
- Create: `src/ui/lifecycle/removal-dialog.tsx`
- Create: `src/ui/lifecycle/operation-tray.tsx`
- Create: `src/ui/lifecycle/operation-receipt.tsx`
- Modify: `src/ui/projects/project-card.tsx`
- Modify: `src/ui/projects/project-detail.tsx`
- Test: `tests/unit/lifecycle-ui.test.tsx`

**Interfaces:**
- Consumes: policy prompts, coordinator phases, receipts, and typed confirm/cancel/review intents.
- Produces: mandatory modal sequence, durable progress tray, and dismissible verified result.

- [ ] **Step 1: Write failing warning-interaction test**

```tsx
expect(screen.getByText(CURRENT_ASSESSMENT_WARNING)).toBeVisible();
expect(screen.getByRole("button", { name: "Review assessment" })).toBeVisible();
expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
expect(screen.getByRole("button", { name: "Install anyway" })).toBeVisible();
```

Prove reviewing opens the report and returns to the still-pending dialog, Escape cancels, focus is trapped, immediate danger uses text plus red token, and a fresh install attempt reopens the warning.

- [ ] **Step 2: Run focused test and observe missing-dialog failures**

Run: `npm.cmd test -- tests/unit/lifecycle-ui.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement dialogs and operation surfaces**

Render disclosure before concern warning. Disable all lifecycle actions while the operation lock is occupied. The tray survives route changes and popup close through service state; reopening shows current phase or the stored receipt. The receipt distinguishes requested, host accepted, verified, failed, and retryable steps.

- [ ] **Step 4: Wire cards and details through intents**

Components call the shell intent dispatcher only. `Current extension` renders `View project` and `Manage in SillyTavern`; it never renders lifecycle actions even if a malformed view model requests them, providing defense in depth.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/lifecycle-ui.test.tsx tests/unit/project-card.test.tsx tests/unit/project-detail.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/ui/lifecycle src/ui/projects/project-card.tsx src/ui/projects/project-detail.tsx tests/unit/lifecycle-ui.test.tsx
git commit -m "feat(ui): add lifecycle trust flow"
```

## Phase exit gate

Run:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- tests/unit/lifecycle-policy.test.ts tests/unit/self-protection.test.ts tests/unit/trust-policy.test.ts tests/unit/install-lifecycle.test.ts tests/unit/remove-lifecycle.test.ts tests/unit/operation-lock.test.ts tests/unit/lifecycle-ui.test.tsx
npm.cmd run build
```

Then exercise a harmless fixture extension through FakeHost and an isolated SillyTavern profile: first disclosure, low concern, material concern, immediate danger, stale concern, cancel, report review/return, successful install, verification failure, managed removal, external removal, and self-protection. Record exact warning copy and host call order.
