# Checked or Newest Install Choice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players install either TavernKeeper's most recently checked project version or the newest creator version, with one compact choice only when those versions differ.

**Architecture:** Add immutable install targets and capability-aware revision operations to the host boundary. A shared verified-install service enforces the selected revision for individual and Kit installs; controlled Preact surfaces collect choices without persistent defaults or extra confirmation steps.

**Tech Stack:** TypeScript, Preact, Vitest, Testing Library, Playwright, esbuild, SillyTavern extension APIs.

**Spec:** `docs/superpowers/specs/2026-08-19-checked-or-newest-install-design.md`

## Global Constraints

- Normal UI copy uses **Checked version** and **Newest version**; hashes and branch names stay in optional details.
- Never call either target safe, unsafe, secure, risky, verified, or recommended.
- Ask only when checked and newest revisions differ; never remember a default.
- Never pass an arbitrary SHA through the legacy branch argument.
- Never silently substitute Newest when Checked was selected.
- A pinned install succeeds only after local `HEAD` exactly equals the selected 40-character SHA.
- Existing managed records remain owned and normalize to `legacy-unknown` provenance.
- Older SillyTavern hosts retain direct Newest installation without exposing a fake version choice.
- Individual and Kit installs use the same target and verification services.
- Preserve Companion self-protection, operation locking, sanitized errors, and post-host rediscovery.

---

### Task 1: Define install targets and backward-compatible provenance

**Files:**
- Create: `src/lifecycle/install-target.ts`
- Modify: `src/inventory/inventory-types.ts`
- Modify: `src/inventory/managed-registry.ts`
- Modify: `src/lifecycle/operation-receipt.ts`
- Test: `tests/unit/install-target.test.ts`
- Test: `tests/unit/managed-registry.test.ts`

**Interfaces:**
- Produces: `InstallTarget`, `ManagedInstallProvenance`, `legacyInstallProvenance()`, `isFullCommitSha()`, and optional `installProvenance` on lifecycle receipts.
- Consumes: TavernKeeper report metadata already present on `CatalogProject`.

- [ ] **Step 1: Write failing target and legacy-normalization tests**

```ts
expect(isFullCommitSha("a".repeat(40))).toBe(true);
expect(isFullCommitSha("a".repeat(39))).toBe(false);
expect(normalizeManagedExtensionMap({ alpha: legacyRecord }).alpha.provenance).toEqual({
  targetKind: "legacy-unknown",
  requestedSha: null,
  installedSha: null,
  catalogGeneratedAt: null,
  tavernKeeperReportId: null,
});
```

- [ ] **Step 2: Run the focused tests and confirm the new exports are missing**

Run: `npm.cmd test -- tests/unit/install-target.test.ts tests/unit/managed-registry.test.ts`

Expected: FAIL because `install-target.ts` and provenance fields do not exist.

- [ ] **Step 3: Add the exact target and provenance unions**

```ts
export type InstallTarget =
  | {
      kind: "checked";
      requestedSha: string;
      checkedAt: string;
      reportId: string;
      reportUrl: string;
    }
  | {
      kind: "newest";
      requestedSha: string | null;
      resolvedAt: string | null;
    };

export type ManagedInstallProvenance =
  | {
      targetKind: "checked" | "newest";
      requestedSha: string | null;
      installedSha: string | null;
      catalogGeneratedAt: string;
      tavernKeeperReportId: string | null;
    }
  | {
      targetKind: "legacy-unknown";
      requestedSha: null;
      installedSha: null;
      catalogGeneratedAt: null;
      tavernKeeperReportId: null;
    };

export const legacyInstallProvenance = (): ManagedInstallProvenance => ({
  targetKind: "legacy-unknown",
  requestedSha: null,
  installedSha: null,
  catalogGeneratedAt: null,
  tavernKeeperReportId: null,
});
```

Make `ManagedRegistry.recordInstalled` require provenance for new calls. Normalize records without it to the legacy object; reject malformed partial provenance. Extend `LifecycleReceipt` and `createReceipt` with optional `installProvenance` and `cleanupOutcome: "not-needed" | "succeeded" | "failed" | null`.

- [ ] **Step 4: Run the focused tests**

Run: `npm.cmd test -- tests/unit/install-target.test.ts tests/unit/managed-registry.test.ts tests/unit/receipt-dismissal.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the target model**

```powershell
git add -- src/lifecycle/install-target.ts src/inventory/inventory-types.ts src/inventory/managed-registry.ts src/lifecycle/operation-receipt.ts tests/unit/install-target.test.ts tests/unit/managed-registry.test.ts
git commit -m "feat(lifecycle): model install targets"
```

### Task 2: Add capability-aware host revision operations

**Files:**
- Modify: `src/host/host-types.ts`
- Modify: `src/host/sillytavern-host.ts`
- Modify: `src/host/runtime-host.ts`
- Modify: `tests/helpers/fake-host.ts`
- Modify: `tests/unit/host-contract.test.ts`
- Modify: `tests/unit/runtime-host.test.ts`

**Interfaces:**
- Produces: `HostInstallCapabilities`, `HostResolvedRevision`, `getInstallCapabilities()`, `resolveRemoteRevision()`, `readLocalRevision()`, and `commitSha` on `HostExtensionAdapter.install`.
- Consumes: the compatible host endpoints `/api/extensions/capabilities`, `/api/extensions/resolve`, `/api/extensions/version`, and the extended `installExtension(url, global, branch, commitSha)` helper.

- [ ] **Step 1: Write failing legacy and capable host tests**

```ts
await expect(legacyHost.getInstallCapabilities()).resolves.toEqual({
  pinnedCommitInstall: false,
  remoteRevisionLookup: false,
  localRevisionLookup: true,
});
await expect(capableHost.resolveRemoteRevision({ repositoryUrl, branch: null })).resolves.toEqual({
  sha: "b".repeat(40),
});
await capableHost.install({ repositoryUrl, branch: null, commitSha: "a".repeat(40) });
expect(installExtension).toHaveBeenCalledWith(repositoryUrl, false, "", "a".repeat(40));
```

Cover malformed hashes, a 404 capability response, sanitized non-OK responses, and `/api/extensions/version` returning an empty hash.

- [ ] **Step 2: Run the host tests and verify interface failures**

Run: `npm.cmd test -- tests/unit/host-contract.test.ts tests/unit/runtime-host.test.ts`

Expected: FAIL because revision methods and the fourth install argument are absent.

- [ ] **Step 3: Extend the host contract**

```ts
export interface HostInstallCapabilities {
  pinnedCommitInstall: boolean;
  remoteRevisionLookup: boolean;
  localRevisionLookup: boolean;
}

export interface HostExtensionAdapter {
  getInstallCapabilities(): Promise<HostInstallCapabilities>;
  resolveRemoteRevision(input: { repositoryUrl: string; branch: string | null }): Promise<{ sha: string }>;
  install(input: { repositoryUrl: string; branch: string | null; commitSha?: string | null }): Promise<void>;
  readLocalRevision(input: { internalName: string; type: HostExtensionType }): Promise<string | null>;
  // existing methods remain unchanged
}
```

The real adapter treats a missing capability endpoint as legacy support, validates every returned SHA locally, and refuses `commitSha` unless pinned support is advertised. Map the host's explicit unavailable-commit response to `HostRevisionUnavailableError`; do not infer unavailability from arbitrary network failures. The fake host accepts configurable capabilities, remote heads, installed revisions, unavailable hashes, and deliberate mismatch results.

- [ ] **Step 4: Run the host tests**

Run: `npm.cmd test -- tests/unit/host-contract.test.ts tests/unit/runtime-host.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the host boundary**

```powershell
git add -- src/host tests/helpers/fake-host.ts tests/unit/host-contract.test.ts tests/unit/runtime-host.test.ts
git commit -m "feat(host): add pinned install capability"
```

### Task 3: Resolve the checked and newest choices

**Files:**
- Create: `src/lifecycle/install-target-resolver.ts`
- Modify: `src/lifecycle/lifecycle-coordinator.ts`
- Test: `tests/unit/install-target-resolver.test.ts`

**Interfaces:**
- Produces: `InstallTargetChoice`, `prepareInstall(projectId)`, and deterministic plain-language disabled/error reasons.
- Consumes: `HostExtensionAdapter`, current `CatalogSnapshot`, `InstallTarget`, and the report's scanned SHA/date.

- [ ] **Step 1: Write the complete failing state-matrix tests**

```ts
expect(await resolver.prepare(projectWithoutReport)).toMatchObject({
  kind: "single",
  target: { kind: "newest", requestedSha: newestSha },
});
expect(await resolver.prepare(projectWithMatchingReport)).toMatchObject({
  kind: "single",
  target: { kind: "checked", requestedSha: newestSha },
});
expect(await resolver.prepare(projectWithOlderReport)).toMatchObject({
  kind: "choose",
  checked: { target: { kind: "checked", requestedSha: checkedSha }, disabledReason: null },
  newest: { kind: "newest", requestedSha: newestSha },
});
```

Add legacy-host, malformed-report, missing-report, and failed-newest-lookup cases. Assert that a legacy host produces one null-SHA Newest target and never exposes a disabled Checked choice.

- [ ] **Step 2: Run the resolver tests and confirm failure**

Run: `npm.cmd test -- tests/unit/install-target-resolver.test.ts`

Expected: FAIL because the resolver is missing.

- [ ] **Step 3: Implement the resolver and coordinator preparation method**

```ts
export type InstallTargetChoice =
  | { kind: "single"; target: InstallTarget }
  | {
      kind: "choose";
      checked: { target: Extract<InstallTarget, { kind: "checked" }>; disabledReason: string | null };
      newest: Extract<InstallTarget, { kind: "newest" }>;
    };
```

Use live host resolution on capable hosts. On legacy hosts, use a single null-SHA Newest target and bypass the chooser. Do not catch a capable-host lookup failure into a legacy install.

- [ ] **Step 4: Run the resolver and existing lifecycle tests**

Run: `npm.cmd test -- tests/unit/install-target-resolver.test.ts tests/unit/install-lifecycle.test.ts tests/unit/lifecycle-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit target preparation**

```powershell
git add -- src/lifecycle/install-target-resolver.ts src/lifecycle/lifecycle-coordinator.ts tests/unit/install-target-resolver.test.ts tests/unit/install-lifecycle.test.ts
git commit -m "feat(lifecycle): prepare version choices"
```

### Task 4: Enforce and record the selected revision

**Files:**
- Create: `src/lifecycle/verified-install.ts`
- Modify: `src/lifecycle/lifecycle-coordinator.ts`
- Modify: `src/trust/trust-types.ts`
- Modify: `src/trust/trust-policy.ts`
- Modify: `src/trust/trust-copy.ts`
- Modify: `src/ui/lifecycle/assessment-warning-dialog.tsx`
- Modify: `src/ui/lifecycle/trust-disclosure-dialog.tsx`
- Test: `tests/unit/verified-install.test.ts`
- Test: `tests/unit/install-lifecycle.test.ts`
- Test: `tests/unit/trust-policy.test.ts`
- Test: `tests/unit/lifecycle-ui.test.tsx`

**Interfaces:**
- Produces: `executeVerifiedInstall()`, `install(projectId, target)`, target-aware trust freshness, cleanup outcomes, and plain warning copy.
- Consumes: prepared `InstallTarget`, eligible catalog project, host revision operations, registry provenance, and existing trust prompt broker.

- [ ] **Step 1: Write failing exact-SHA, branch-race, cleanup, and trust tests**

```ts
const receipt = await coordinator.install("alpha", checkedTarget);
expect(host.calls).toContainEqual(expect.objectContaining({
  operation: "install",
  commitSha: checkedSha,
}));
expect(receipt.installProvenance).toMatchObject({
  targetKind: "checked",
  requestedSha: checkedSha,
  installedSha: checkedSha,
});
```

Move the fake remote head after choice preparation and prove the checked-out SHA remains the prepared SHA. Return a different local SHA and prove cleanup runs, ownership stays empty, and the receipt uses `The install didn't finish correctly, so Companion cleaned it up.` Add a cleanup-failure case that remains unowned and requests attention.

- [ ] **Step 2: Run focused tests and verify failures**

Run: `npm.cmd test -- tests/unit/verified-install.test.ts tests/unit/install-lifecycle.test.ts tests/unit/trust-policy.test.ts tests/unit/lifecycle-ui.test.tsx`

Expected: FAIL because install still accepts only a project ID and trust freshness ignores the target.

- [ ] **Step 3: Add the shared verified installer and target-aware policy**

```ts
export async function executeVerifiedInstall(input: {
  host: HostExtensionAdapter;
  project: CatalogProject;
  target: InstallTarget;
}): Promise<{
  extension: HostExtension;
  installedSha: string | null;
  cleanupOutcome: "not-needed" | "succeeded";
}>;
```

Pinned targets require exact `readLocalRevision` equality. On mismatch, remove the newly discovered exact folder and verify absence before returning a typed failure. Legacy Newest permits a null observed hash. Feed `freshness: "current"` to trust policy only when the target SHA equals the report SHA; otherwise feed `"stale"`.

Use plain prompt copy:

```ts
export const CURRENT_ASSESSMENT_WARNING =
  "TavernKeeper found concerns in this version. You can view the check before choosing whether to install it.";
export const STALE_ASSESSMENT_WARNING =
  "TavernKeeper checked an older version of this project. The newest changes have not been checked yet.";
```

Render `High concern` or `Needs a closer look`, `View check`, `Go back`, and `Install this version` in the assessment dialog.

- [ ] **Step 4: Run focused lifecycle and trust tests**

Run: `npm.cmd test -- tests/unit/verified-install.test.ts tests/unit/install-lifecycle.test.ts tests/unit/trust-policy.test.ts tests/unit/lifecycle-ui.test.tsx tests/integration/lifecycle-scenarios.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit verified execution**

```powershell
git add -- src/lifecycle src/trust src/ui/lifecycle tests/unit/verified-install.test.ts tests/unit/install-lifecycle.test.ts tests/unit/trust-policy.test.ts tests/unit/lifecycle-ui.test.tsx tests/integration/lifecycle-scenarios.test.ts
git commit -m "feat(lifecycle): verify chosen revision"
```

### Task 5: Add the individual version chooser

**Files:**
- Create: `src/ui/lifecycle/install-version-chooser.tsx`
- Create: `src/lifecycle/install-target-fallback-broker.ts`
- Modify: `src/ui/lifecycle/operation-receipt.tsx`
- Modify: `src/ui/projects/project-lifecycle-control.tsx`
- Modify: `src/ui/projects/project-card.tsx`
- Modify: `src/ui/projects/project-grid.tsx`
- Modify: `src/ui/projects/projects-route.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Modify: `src/ui/popup-host.tsx`
- Modify: `src/styles/lifecycle.css`
- Modify: `src/styles/responsive.css`
- Test: `tests/unit/install-version-chooser.test.tsx`
- Test: `tests/unit/install-target-fallback-broker.test.ts`
- Modify: `tests/unit/project-card.test.tsx`
- Modify: `tests/unit/lifecycle-ui.test.tsx`

**Interfaces:**
- Produces: controlled `InstallVersionChooser`, anchor-aware install requests, a promise-backed fallback broker, pending-choice state, and short receipt summaries with optional technical details.
- Consumes: `LifecycleCoordinator.prepareInstall`, `InstallTargetChoice`, and `LifecycleCoordinator.install(projectId, target)`.

- [ ] **Step 1: Write failing chooser interaction tests**

```tsx
expect(screen.getByRole("heading", { name: "Which version would you like?" })).toBeVisible();
expect(screen.getByRole("button", { name: "Checked version" })).toHaveAccessibleDescription(
  "TavernKeeper checked this version on Aug 17.",
);
expect(screen.getByRole("button", { name: "Newest version" })).toHaveAccessibleDescription(
  "The latest version from the creator. It may include changes TavernKeeper hasn't checked yet.",
);
```

Prove selection calls the exact target once, unavailable Checked uses `That checked version isn't available anymore. You can choose the newest version or cancel.`, outside click and Escape close, focus returns to Install, and every single target bypasses the chooser. Prove the fallback broker resolves exactly once and cancellation returns `null`.

- [ ] **Step 2: Run UI tests and confirm missing-component failures**

Run: `npm.cmd test -- tests/unit/install-version-chooser.test.tsx tests/unit/install-target-fallback-broker.test.ts tests/unit/project-card.test.tsx tests/unit/lifecycle-ui.test.tsx`

Expected: FAIL because the chooser and preparation wiring do not exist.

- [ ] **Step 3: Implement controlled chooser and popup-host orchestration**

Store `{ projectId, projectName, anchor, choice }` in `CompanionPopupHost`. The card passes the actual lifecycle button as the anchor. A single target calls install immediately; a two-target result opens the chooser. The chooser uses a body portal with fixed positioning, recomputes on resize/scroll, stays inside the viewport, and never traps focus. When `HostRevisionUnavailableError` reaches the individual flow, reopen the same chooser with Checked disabled and a freshly prepared Newest target; Cancel resolves without a host call.

Keep technical hashes out of the default UI. Receipt summary selects only:

```ts
targetKind === "checked" ? "Installed the checked version." : "Installed the newest version."
```

Add a closed-by-default Details disclosure containing requested SHA, installed SHA, catalog time, and TavernKeeper report link. Do not render those fields outside the disclosure.

- [ ] **Step 4: Run focused UI tests and typecheck**

Run: `npm.cmd test -- tests/unit/install-version-chooser.test.tsx tests/unit/install-target-fallback-broker.test.ts tests/unit/project-card.test.tsx tests/unit/lifecycle-ui.test.tsx && npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the individual flow**

```powershell
git add -- src/lifecycle/install-target-fallback-broker.ts src/ui src/styles/lifecycle.css src/styles/responsive.css tests/unit/install-version-chooser.test.tsx tests/unit/install-target-fallback-broker.test.ts tests/unit/project-card.test.tsx tests/unit/lifecycle-ui.test.tsx
git commit -m "feat(ui): choose checked or newest"
```

### Task 6: Bind version choices into Kit preflight and execution

**Files:**
- Modify: `src/kits/kit-plan.ts`
- Modify: `src/kits/kit-planner.ts`
- Modify: `src/kits/kit-receipt.ts`
- Modify: `src/kits/kit-operation-journal.ts`
- Modify: `src/kits/kit-executor.ts`
- Create: `src/kits/kit-install-targets.ts`
- Modify: `src/ui/kits/kit-preflight-dialog.tsx`
- Create: `src/ui/kits/kit-version-choices.tsx`
- Modify: `src/ui/popup-host.tsx`
- Test: `tests/unit/kit-install-targets.test.ts`
- Modify: `tests/unit/kit-planner.test.ts`
- Modify: `tests/unit/kit-preflight-ui.test.tsx`
- Modify: `tests/unit/kit-install-executor.test.ts`
- Modify: `tests/integration/kit-scenarios.test.ts`

**Interfaces:**
- Produces: target choices on install steps, `selectedInstallTargets` and `installTargetBinding` in `KitApproval`, journaled selected targets, and shared exact-SHA Kit installation.
- Consumes: `prepareInstallTargetChoice`, `executeVerifiedInstall`, `InstallTargetFallbackBroker`, and existing plan/catalog/inventory bindings.

- [ ] **Step 1: Write failing mixed-preflight and execution tests**

```ts
expect(plan.install.map(({ projectId, targetChoice }) => [projectId, targetChoice.kind])).toEqual([
  ["same", "single"],
  ["different", "choose"],
  ["unscanned", "single"],
]);
expect(confirmButton).toBeDisabled();
fireEvent.click(screen.getByRole("radio", { name: "Checked version for Different" }));
expect(confirmButton).toBeEnabled();
```

Prove approval rejects a missing, altered, or no-longer-offered target; executor passes exact targets to the shared verifier; journal recovery retains target identity; and a checked failure never installs Newest without broker approval. Add a late-unavailable test where completed steps remain recorded, the broker offers a freshly resolved Newest target, Cancel leaves all later steps untouched, and accepting Newest reruns target-aware trust policy before continuing.

- [ ] **Step 2: Run focused Kit tests and confirm type failures**

Run: `npm.cmd test -- tests/unit/kit-install-targets.test.ts tests/unit/kit-planner.test.ts tests/unit/kit-preflight-ui.test.tsx tests/unit/kit-install-executor.test.ts tests/integration/kit-scenarios.test.ts`

Expected: FAIL because Kit steps and approvals have no target fields.

- [ ] **Step 3: Implement asynchronous target preparation and frozen approval binding**

```ts
export interface KitInstallTargetSelection {
  projectId: string;
  target: InstallTarget;
}

export interface KitApproval {
  // existing binding fields
  selectedInstallTargets: KitInstallTargetSelection[];
  installTargetBinding: string;
}
```

Prepare all choices before showing preflight. Hash the normalized `[projectId, target]` list into the binding. Validate the binding before taking the operation lock and again after catalog/inventory validation. Journal the selected list before the first mutation. Use `executeVerifiedInstall` per install step and record target provenance with `installedBy: "kit"`. Inject the shared fallback broker into `KitExecutor`; on `HostRevisionUnavailableError`, await its Newest-or-Cancel result. Cancel marks the current project failed, records every remaining install step as untouched and retryable, and ends with a partial receipt. Accepting Newest updates the journal target, reruns that project's trust prompts, and then calls the verifier with the newly approved target.

- [ ] **Step 4: Run Kit and lifecycle regression tests**

Run: `npm.cmd test -- tests/unit/kit-install-targets.test.ts tests/unit/kit-planner.test.ts tests/unit/kit-preflight-ui.test.tsx tests/unit/kit-install-executor.test.ts tests/integration/kit-scenarios.test.ts tests/integration/lifecycle-scenarios.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Kit target selection**

```powershell
git add -- src/kits src/ui/kits src/ui/popup-host.tsx tests/unit/kit-install-targets.test.ts tests/unit/kit-planner.test.ts tests/unit/kit-preflight-ui.test.tsx tests/unit/kit-install-executor.test.ts tests/integration/kit-scenarios.test.ts
git commit -m "feat(kits): choose install versions"
```

### Task 7: Prove responsive behavior, packaging, and user guidance

**Files:**
- Create: `tests/e2e/install-version-choice.spec.ts`
- Create: `tests/e2e/install-version-choice.spec.ts-snapshots/checked-or-newest-390x844.png`
- Create: `tests/e2e/install-version-choice.spec.ts-snapshots/checked-or-newest-1440x960.png`
- Modify: `tests/fixtures/ui-harness-entry.tsx`
- Modify: `docs/user/browsing-and-installing.md`
- Modify: `docs/user/safety-and-trust.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: completed individual and Kit flows.
- Produces: deterministic browser proof, plain user documentation, and release-ready bundled artifacts.

- [ ] **Step 1: Add failing browser scenarios**

Exercise divergent versions on a capable host, matching versions, no scan, direct legacy installation, Escape/focus restoration, touch choice, mobile clipping, 200% text, and Kit mixed selection. Assert the UI contains no default-view 40-character hashes and no prohibited safety claims.

- [ ] **Step 2: Run the new browser test and inspect the expected failure**

Run: `npm.cmd run test:e2e -- tests/e2e/install-version-choice.spec.ts`

Expected: FAIL until the harness exposes capable and legacy host fixtures and snapshots are generated.

- [ ] **Step 3: Complete harness states, responsive styling, and plain user docs**

Document:

```md
When TavernKeeper checked an older version, Companion lets you choose:

- **Checked version:** the version TavernKeeper last checked.
- **Newest version:** the latest version from the creator.

Companion never switches your choice without asking.
```

Build committed `dist/extension.js` and `dist/companion.css` only after source tests pass.

- [ ] **Step 4: Run the complete release gate**

Run:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run release:package
npm.cmd run release:verify
git diff --check
```

Expected: all commands pass; browser snapshots show no clipping or extra modal; release verification accepts the generated package.

- [ ] **Step 5: Commit release proof and artifacts**

```powershell
git add -- tests/e2e tests/fixtures/ui-harness-entry.tsx docs/user README.md dist
git commit -m "test: prove install version choice"
```

## Integration and publication

- Rebase or merge the branch onto current `origin/main` without touching the dirty primary checkout.
- Rerun the complete release gate after synchronization.
- Review the final diff for unrelated files, secrets, technical hashes in normal UI copy, and prohibited safety claims.
- Push the feature branch, merge it into `main` without force-pushing, and push `main`.
- Verify the exact remote `main` SHA and GitHub Actions status using GitHub CLI with network permission enabled.
