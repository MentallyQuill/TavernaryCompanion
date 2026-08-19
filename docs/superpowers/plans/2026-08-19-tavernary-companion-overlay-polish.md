# Tavernary Companion Overlay Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the double-panel popup with one Tavernary-native overlay, correct shell/card/Kit/Installed presentation and interactions, and certify the result in both the deterministic harness and a real SillyTavern Playwright session.

**Architecture:** Keep the native SillyTavern Popup as lifecycle owner while opting this popup into a transparent wrapper and backdrop dismissal. Extend existing Companion view models with explicit filter facets, installed extension identity/toggle state, and installed Kit grouping. Reuse Companion's Tavernary-derived filter primitives and card grammar rather than building a second component system.

**Tech Stack:** TypeScript 6, Preact 10, CSS, Vitest, Testing Library, Playwright, esbuild, SillyTavern native Popup APIs.

**Spec:** `docs/superpowers/specs/2026-08-19-tavernary-companion-overlay-polish-design.md`

## Global Constraints

- Current `F:\git\Tavernary` source is the visual authority for every applicable control and surface.
- Preserve trust, lifecycle, inventory reconciliation, self-protection, Kit operation, focus restoration, and popup lifecycle behavior.
- Use one failing behavior test before each production change and observe the expected failure.
- Preserve unrelated primary-checkout changes and never reset or force-push.
- Installed-host Playwright must restore any extension state it changes.
- Completion means merged remote `main` plus exact-SHA/check verification, not only a green feature branch.

---

### Task 1: Transparent native overlay and external close

**Files:** `src/host/host-types.ts`, `src/host/runtime-host.ts`, `src/ui/launcher.ts`, `src/styles/shell.css`, `src/styles/responsive.css`, `tests/unit/launcher.test.tsx`, `tests/unit/runtime-host.test.ts`, `tests/e2e/shell-responsive.spec.ts`.

- [ ] Add failing unit tests for transparent popup options, backdrop-only dismissal, cleanup, and launcher focus restoration.
- [ ] Run the focused tests and confirm each fails because the option/behavior is absent.
- [ ] Extend the native Popup seam with `transparent`, `onOpen`, `onClose`, dialog, close button, and completion contracts; close only when the pointer target is the dialog backdrop.
- [ ] Pass the transparent/backdrop options from the launcher without changing other popup users.
- [ ] Add failing Playwright geometry/computed-style tests for the absent grey wrapper, blurred backdrop, and large circular external close at desktop/mobile sizes.
- [ ] Replace the root clip/inset styling and native wrapper styling with one panel and responsive safe-area close placement.
- [ ] Rerun focused unit and Playwright tests to green.

### Task 2: Shell typography and visual normalization

**Files:** `src/ui/shell/shell-header.tsx`, `src/styles/tokens.css`, `src/styles/shell.css`, `src/styles/projects.css`, `src/styles/kits.css`, `src/styles/lifecycle.css`, `src/styles/responsive.css`, `tests/unit/companion-shell.test.tsx`, `tests/e2e/brand-alignment.spec.ts`.

- [ ] Add failing assertions for the Tavernary-only wordmark, absence of qualifier/tagline, compact freshness/Refresh typography, exact font family, button metrics, and header alignment.
- [ ] Remove qualifier/tagline markup and obsolete responsive rules.
- [ ] Port the applicable Tavernary type, opacity, border, radius, button, and alignment values into scoped Companion selectors; explicitly neutralize host inheritance.
- [ ] Rerun the focused unit and browser assertions to green at 1440x960, 1024x768, 412x915, and 390x844.

### Task 3: Project card hit targets and installed illumination

**Files:** `src/ui/projects/project-card.tsx`, `src/styles/projects.css`, `tests/unit/project-card.test.tsx`, `tests/e2e/project-card-interactions.spec.ts`.

- [ ] Add failing tests proving an installed card exposes a state class and non-control card surface opens `canonicalUrl` while controls do not.
- [ ] Add a Playwright regression that records `cursor`, element hit targets, new-page/navigation events, and callbacks for body, title, scan, install/uninstall, and Kit controls.
- [ ] Replace the pseudo-element overlay with a stable semantic card hit area, preserve one accessible source link, and isolate all controls with explicit stacking/focus behavior.
- [ ] Add the restrained installed edge illumination and reduced-motion-safe hover/focus states.
- [ ] Rerun unit and Playwright interaction tests to green.

### Task 4: Personal-first Kits and Tavernary Published filters

**Files:** `src/kits/kit-discovery-controller.ts`, `src/catalog/catalog-core.ts` as needed, `src/ui/kits/kits-route.tsx`, `src/ui/kits/kit-filter-panel.tsx`, `src/ui/projects/filter-controls.tsx`, `src/styles/kits.css`, `src/styles/responsive.css`, `tests/unit/kit-discovery-controller.test.ts`, `tests/unit/kits-route.test.tsx`, `tests/e2e/kit-switching.spec.ts`.

- [ ] Add failing controller/UI tests for Personal default/order and real counted Kit filter facets.
- [ ] Derive frontend, purpose, model-family, project, size, and availability facets from catalog data with independent literal expectations.
- [ ] Rebuild Published filters using the shared Tavernary list/chip controls, searchable disclosure, single selection, dual range, clear action, desktop rail, and mobile sheet.
- [ ] Add failing/green tests for every filter dimension, clearing, focus restoration, backdrop/Escape close, and filtered result count.
- [ ] Enforce left-aligned Kit descriptions and verify responsive layout.

### Task 5: Installed cards, Kit grouping, and extension toggles

**Files:** `src/catalog/installed-view-model.ts`, `src/ui/installed/installed-route.tsx`, `src/ui/installed/installed-section.tsx`, new focused installed card/Kit group components as needed, `src/ui/shell/companion-shell.tsx`, `src/ui/popup-host.tsx`, `src/styles/projects.css`, `src/styles/kits.css`, `tests/unit/project-view-model.test.ts`, `tests/unit/installed-route.test.tsx`, `tests/unit/companion-shell.test.tsx`, `tests/unit/popup-host.test.tsx` or nearest existing host test.

- [ ] Add failing view-model tests for `internalName`, toggleability, self-protection, and installed Kit membership.
- [ ] Add failing UI tests for card-grid semantics, Kit groups before extensions, membership labels, and Enable/Disable state.
- [ ] Extend the installed presentation model and pass installed Kit inspectors/membership through `CompanionShell`.
- [ ] Render Kit group cards and extension cards, preserving management/uninstall semantics.
- [ ] Add the host toggle callback in `popup-host`, refresh inventory on success, surface errors, and disable pending/self-protected controls.
- [ ] Rerun focused model/UI/host tests to green.

### Task 6: Responsive visual baselines and deterministic Playwright playtest

**Files:** `tests/e2e/harness.ts`, `tests/e2e/shell-responsive.spec.ts`, `tests/e2e/brand-alignment.spec.ts`, `tests/e2e/project-card-interactions.spec.ts`, `tests/e2e/responsive-conformance.spec.ts`, snapshot PNGs.

- [ ] Make the harness emulate the native transparent dialog, backdrop, close button, external-link events, and extension toggle state.
- [ ] Run all focused Playwright suites without snapshot updates; inspect functional failures first.
- [ ] Fix the smallest source seam for each bug and rerun until geometry, interactions, accessibility, overflow, reduced motion, and 200% text pass.
- [ ] Update deterministic screenshots only after assertions are green and inspect every PNG directly.
- [ ] Run the complete Playwright suite from a fresh process.

### Task 7: Real SillyTavern playtest, release, and main integration

**Files:** release artifacts under `dist/`, relevant implementation evidence document, Git history/PR.

- [ ] Run `npm.cmd run check`, full Playwright, release packaging, and release verification; inspect status/diff.
- [ ] Locate the exact local SillyTavern profile and installed Companion artifact, back it up, install the verified package, and start/use the existing host safely.
- [ ] Use Playwright against real SillyTavern at desktop/mobile sizes to exercise launcher, close/backdrop/Escape, all routes, search/navigation/filters, card cursor/hit targets, repository opening, Kit flows, installed grouping, and Enable/Disable with state restoration.
- [ ] Record exact artifact SHA/path, host/profile, browser results, console/page/network results, and screenshots separately from harness proof.
- [ ] Commit intentional source/tests/baselines/artifacts using scoped commits, synchronize with remote `main`, push the feature branch, and update PR #4.
- [ ] Merge to `main`, verify local/remote exact SHA, run/check post-merge GitHub Actions, and confirm no unrelated primary-checkout files were included.
