# Install Version Clarity Implementation Plan

**Goal:** Make scanned-versus-latest version choices immediately understandable while preserving a fast, calm install flow.

**Architecture:** Reuse the existing TavernKeeper indicator inside a shared version-choice option. Route newest-only individual installs through a lightweight awareness dialog at the UI dispatch boundary, leaving target resolution and Kit planning semantics intact. Derive stale-panel copy from scanned/current SHA equality.

**Tech stack:** TypeScript, Preact, Vitest, Testing Library, Playwright.

**Spec:** `docs/design/09-install-version-clarity.md`

## Task 1: Lock the copy and behavior with failing unit tests

**Files:**

- Modify: `tests/unit/install-version-chooser.test.tsx`
- Modify: `tests/unit/update-version-chooser.test.tsx`
- Modify: `tests/unit/tavernkeeper-scan-indicator.test.tsx`
- Modify: relevant trust and Kit UI tests

- [x] Assert the standardized **Latest scanned** and **Latest from creator** labels and relationship descriptions.
- [x] Assert the latest-scanned option renders a working TavernKeeper trigger and panel.
- [x] Assert newest-only prepared installs route to awareness rather than immediate installation.
- [x] Assert same-SHA stale and different-SHA stale panel explanations.
- [x] Assert the simplified disclosure and Kit vocabulary.
- [x] Run focused tests and confirm they fail for the intended missing behavior.

## Task 2: Implement the shared version option and awareness flow

**Files:**

- Create: `src/ui/lifecycle/version-choice-option.tsx`
- Create: `src/ui/lifecycle/install-version-awareness.tsx`
- Modify: `src/ui/lifecycle/install-version-chooser.tsx`
- Modify: `src/ui/installed/update-version-chooser.tsx`
- Modify: `src/ui/popup-host.tsx`
- Modify: `src/styles/lifecycle.css`

- [x] Render the selection control and scan trigger as accessible siblings.
- [x] Keep scan-panel interactions inside the chooser's dismissal boundary.
- [x] Pass revision-matched TavernKeeper status to install and update choosers.
- [x] Route a single newest target to the awareness dialog; continue directly for a single exact scanned target.
- [x] Preserve cancel, focus return, backdrop, Escape, mobile centering, and blur behavior.
- [x] Run focused UI tests to green.

## Task 3: Standardize copy and stale explanations

**Files:**

- Modify: `src/ui/projects/tavernkeeper-scan-indicator.tsx`
- Modify: `src/ui/kits/kit-version-choices.tsx`
- Modify: `src/trust/trust-copy.ts`
- Modify: affected unit tests and user documentation

- [x] Distinguish assessment-refresh staleness from creator changes.
- [x] Use the approved plain-language disclosure.
- [x] Apply consistent version labels and gentle awareness copy.
- [x] Keep all security states textual and not color-only.
- [x] Run focused tests to green.

## Task 4: Add the installed-behind-both browser scenario

**Files:**

- Modify: `tests/fixtures/ui-harness-entry.tsx`
- Modify: `tests/e2e/installed-updates.spec.ts`
- Modify: `tests/e2e/install-version-choice.spec.ts`

- [x] Create a fixture whose installed SHA is behind both the scanned and creator-latest SHAs.
- [x] Assert both update choices and their relationship copy.
- [x] Assert desktop hover/focus/click and mobile tap expose the scan panel.
- [x] Assert cancel paths do not update or install.
- [x] Run the focused Playwright suite on desktop and mobile projects.

## Task 5: Complete verification and integration

- [x] Run formatting, lint, typecheck, the full unit suite, build, and the full Playwright suite.
- [x] Review the final diff against this specification.
- [x] Rebase safely against current remote `main` and fast-forward `main`.
- [x] Verify remote `main` points to the tested commit.
