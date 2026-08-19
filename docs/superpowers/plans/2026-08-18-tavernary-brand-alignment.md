# Tavernary Brand Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Tavernary Companion visibly and structurally the same branded web software as Tavernary while retaining Companion lifecycle actions and Directive-style overlay containment.

**Architecture:** Vendor Tavernary's exact visual primitives—logo, Inter Variable font, tokens, icons, and component grammar—behind Companion-prefixed selectors. Keep host APIs and catalog behavior unchanged. Add native-popup geometry coverage and use installed SillyTavern Playwright screenshots as the final visual authority.

**Tech Stack:** TypeScript, Preact, CSS container queries, esbuild, Vitest, Testing Library, Playwright, SillyTavern native popup.

**Spec:** `docs/design/08-tavernary-brand-alignment.md`

## Global Constraints

- Tavernary production visual tokens and assets are authoritative.
- Directive contributes overlay behavior and outer framing only.
- SillyTavern supplies the popup and extension lifecycle, not the Companion palette.
- Search/filter/sort semantics remain shared CatalogCore behavior.
- No install, Kit, trust, or self-protection policy may weaken during the redesign.
- Use test-driven development for behavior, component structure, build output, and geometry changes.
- Validate the installed extension at 1440x960 and 390x844 after every material visual pass.

---

### Task 1: Ship Tavernary brand assets and production tokens

**Files:**
- Create: `src/assets/tavernary-trihex.png`
- Create: `src/assets/inter-latin-wght-normal.woff2`
- Create: `src/assets/inter-latin-ext-wght-normal.woff2`
- Modify: `scripts/build.mjs`
- Modify: `scripts/package-release.mjs`
- Modify: `src/styles/tokens.css`
- Test: `tests/unit/build.test.ts`
- Test: `tests/unit/release-package.test.ts`

**Interfaces:**
- Produces: stable release paths under `dist/assets/` for the trihex mark and Inter Variable font files.
- Produces: Companion-prefixed aliases for Tavernary's production semantic tokens.

- [ ] **Step 1: Write failing build and release tests**

Assert that a production build emits the three static assets, that `dist/companion.css` references them through relative URLs, and that the deterministic release archive contains the existing files plus those exact asset paths.

- [ ] **Step 2: Run tests and observe the asset contract fail**

Run: `npm.cmd test -- tests/unit/build.test.ts tests/unit/release-package.test.ts`

Expected: FAIL because the assets are neither emitted nor packaged.

- [ ] **Step 3: Vendor the exact Tavernary assets and copy them during build**

Copy Tavernary's production trihex PNG and Inter Variable Latin font files byte-for-byte. Extend `buildExtension()` to recreate `dist/assets/` and copy the assets there. Add the three stable paths to `RELEASE_FILES`.

- [ ] **Step 4: Replace host-derived colors with Tavernary tokens**

Define `@font-face` entries and port Tavernary's complete production token set under `--tavernary-*` names. Keep legacy `--tavernary-companion-*` aliases temporarily so downstream component passes remain incremental.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/build.test.ts tests/unit/release-package.test.ts`

Expected: PASS with deterministic asset bytes and archive entries.

### Task 2: Rebuild the shell and native popup containment

**Files:**
- Modify: `src/ui/shell/shell-header.tsx`
- Modify: `src/ui/shell/route-tabs.tsx`
- Modify: `src/ui/catalog/catalog-state-panel.tsx`
- Modify: `src/styles/shell.css`
- Modify: `src/styles/responsive.css`
- Modify: `tests/fixtures/ui-harness.html`
- Test: `tests/unit/companion-shell.test.tsx`
- Test: `tests/unit/catalog-state-panel.test.tsx`
- Test: `tests/e2e/shell-responsive.spec.ts`
- Create: `tests/e2e/brand-alignment.spec.ts`

**Interfaces:**
- Produces: Tavernary brand lockup, Companion qualifier, single freshness/refresh presentation, Tavernary-shaped route navigation, and a parent-constrained overlay.

- [ ] **Step 1: Write failing brand and installed-popup geometry tests**

Render a simulated centered native popup content box. Assert the shell's right edge never exceeds either the parent or viewport. Assert the brand region exposes the Tavernary name, tagline, Companion qualifier, and trihex mark. Assert computed header, canvas, active navigation, focus, and primary-action colors equal the literal production values in the design.

- [ ] **Step 2: Run the tests and observe failures**

Run: `npm.cmd run test:e2e -- tests/e2e/shell-responsive.spec.ts tests/e2e/brand-alignment.spec.ts`

Expected: FAIL on native-popup right-edge clipping and missing brand lockup.

- [ ] **Step 3: Implement parent-aware shell geometry and Tavernary header/navigation**

Constrain the root against its parent and remove mobile `100vw` overflow. Apply the exact Tavernary canvas/header/sidebar surfaces, Inter typography, teal active navigation, and orange functional controls. Keep beveling only on the outer overlay frame.

- [ ] **Step 4: Remove duplicate freshness presentation**

Keep freshness and refresh in the shell header. Make `CatalogStatePanel` render lifecycle/error content without a second ready-state status row.

- [ ] **Step 5: Run focused unit and browser tests**

Run: `npm.cmd test -- tests/unit/companion-shell.test.tsx tests/unit/catalog-state-panel.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/shell-responsive.spec.ts tests/e2e/brand-alignment.spec.ts`

Expected: PASS with all edges and controls inside the parent and viewport.

### Task 3: Align project cards, query toolbar, and filters

**Files:**
- Create: `src/ui/shared/category-icon.tsx`
- Create: `src/ui/shared/activity-strip.tsx`
- Modify: `src/catalog/project-view-model.ts`
- Modify: `src/ui/projects/project-card.tsx`
- Modify: `src/ui/projects/search-toolbar.tsx`
- Modify: `src/ui/projects/filter-panel.tsx`
- Modify: `src/ui/projects/active-filter-chips.tsx`
- Modify: `src/ui/projects/projects-route.tsx`
- Modify: `src/styles/projects.css`
- Test: `tests/unit/project-view-model.test.ts`
- Test: `tests/unit/project-card.test.tsx`
- Test: `tests/unit/projects-route.test.tsx`
- Test: `tests/e2e/brand-alignment.spec.ts`

**Interfaces:**
- `ProjectCardViewModel` adds display fields for tags, license, weekly activity, evidence freshness, attribution, community aggregate, and repository size when present.
- `ProjectCard` retains existing callbacks and lifecycle actions.

- [ ] **Step 1: Write failing view-model and card-anatomy tests**

Assert that a real catalog fixture projects weekly activity, tag chips, license, attribution, and repository facts. Assert the card exposes kind icon/label, activity strip, title, scan evidence, summary, chips, ownership/license context, Details, and exactly one primary action in Tavernary's scan order.

- [ ] **Step 2: Run focused tests and observe failures**

Run: `npm.cmd test -- tests/unit/project-view-model.test.ts tests/unit/project-card.test.tsx tests/unit/projects-route.test.tsx`

Expected: FAIL because the current view model and card omit Tavernary evidence and chip structure.

- [ ] **Step 3: Port the required Tavernary icon and activity primitives**

Adapt Tavernary's Preact-compatible SVG category icons and 12-week activity strip without adding React or remote assets.

- [ ] **Step 4: Implement Tavernary card anatomy and controls**

Use Tavernary's 8px surface, kind colors, top evidence row, title hierarchy, bounded summary, chips, compact utility row, orange primary action, and secondary Details action. Preserve every lifecycle eligibility and self-protection branch.

- [ ] **Step 5: Rebuild filters and toolbar in Tavernary grammar**

Use the Tavernary sidebar surface, uppercase group labels, selected-first compact choices, tag/frontend search, collapsed overflow, teal selected states, and a fixed compact/mobile sheet. Keep all CatalogCore facets available.

- [ ] **Step 6: Run focused tests and brand browser checks**

Run: `npm.cmd test -- tests/unit/project-view-model.test.ts tests/unit/project-card.test.tsx tests/unit/projects-route.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/brand-alignment.spec.ts`

Expected: PASS with exact computed card/control colors and complete behavior.

### Task 4: Align Kits, Installed, details, dialogs, and operation surfaces

**Files:**
- Modify: `src/ui/kits/kit-card.tsx`
- Modify: `src/ui/kits/kits-route.tsx`
- Modify: `src/ui/installed/installed-route.tsx`
- Modify: `src/ui/installed/installed-section.tsx`
- Modify: `src/ui/projects/project-detail.tsx`
- Modify: `src/ui/lifecycle/dialog-frame.tsx`
- Modify: `src/styles/kits.css`
- Modify: `src/styles/lifecycle.css`
- Modify: `src/styles/projects.css`
- Test: `tests/unit/kits-route.test.tsx`
- Test: `tests/unit/project-detail.test.tsx`
- Test: `tests/unit/lifecycle-ui.test.tsx`
- Test: `tests/e2e/brand-alignment.spec.ts`

**Interfaces:**
- Existing Kit, detail, installed-state, and lifecycle callback contracts remain unchanged.

- [ ] **Step 1: Write failing structural and computed-style tests**

Assert Tavernary card/surface/control primitives across Kit, detail, installed, and dialog routes. Assert empty Installed groups collapse and the Companion record uses self-managed wording rather than unknown-catalog warning language.

- [ ] **Step 2: Run focused tests and observe failures**

Run: `npm.cmd test -- tests/unit/kits-route.test.tsx tests/unit/project-detail.test.tsx tests/unit/lifecycle-ui.test.tsx`

Expected: FAIL on old structure and generic surfaces.

- [ ] **Step 3: Apply the shared Tavernary component system**

Use one card, chip, input, button, section, and dialog language across routes. Preserve orange/red safety distinctions and every existing operation state.

- [ ] **Step 4: Run focused and existing Kit journey tests**

Run: `npm.cmd test -- tests/unit/kits-route.test.tsx tests/unit/project-detail.test.tsx tests/unit/lifecycle-ui.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/kit-switching.spec.ts tests/e2e/brand-alignment.spec.ts`

Expected: PASS.

### Task 5: Bound route rendering and prove the installed experience

**Files:**
- Modify: `src/ui/shell/companion-shell.tsx`
- Modify: `src/ui/projects/project-grid.tsx`
- Modify: `tests/e2e/shell-responsive.spec.ts`
- Modify: `tests/e2e/brand-alignment.spec.ts`
- Modify: `docs/implementation/README.md`
- Modify: `docs/implementation/evidence/companion-installed-v1.md`

**Interfaces:**
- Active primary route alone is mounted.
- `ProjectGrid` retains full result count semantics while rendering a bounded initial batch and a deterministic load-more path.

- [ ] **Step 1: Write failing route-mounting and bounded-render tests**

Assert that Projects does not mount Kit cards, Kits does not mount project cards, and the initial 437-project fixture mounts no more than 30 cards while still announcing `437 projects`.

- [ ] **Step 2: Run the browser tests and observe failures**

Run: `npm.cmd run test:e2e -- tests/e2e/shell-responsive.spec.ts tests/e2e/brand-alignment.spec.ts`

Expected: FAIL because all routes and all 437 cards currently mount.

- [ ] **Step 3: Mount only the active route and add incremental project rendering**

Render 30 projects initially, preserve the complete controller result set, and expose a Tavernary secondary **Show more** control that adds the next deterministic batch without altering query or sorting.

- [ ] **Step 4: Build, package, and install into the isolated SillyTavern profile**

Run: `npm.cmd run release:package`

Install the resulting files into `data/companion-acceptance-v1/extensions/TavernaryCompanion`, preserving the prior installed artifact in the existing acceptance backup area.

- [ ] **Step 5: Capture and compare installed-host screenshots**

At 1440x960 and 390x844 capture Projects, filters, detail, Kits, and Installed. Record bounding boxes, overflow, primary-action visibility, console errors, failed requests, and computed brand tokens. Compare directly with the live Tavernary reference captures.

- [ ] **Step 6: Iterate until alignment and containment pass**

Repeat the focused test, build, install, and screenshot loop for each observed mismatch. Do not accept generic gray surfaces, host-derived typography, missing brand marks, offscreen actions, or non-Tavernary card/control anatomy.

- [ ] **Step 7: Run the complete verification gate**

Run: `npm.cmd run check`

Run: `npm.cmd run test:e2e`

Expected: all unit, contract, build, accessibility, responsive, and journey tests pass with no unexpected warnings.

- [ ] **Step 8: Publish and integrate**

Commit the scoped branch, push it, open a PR, request Codex review, address actionable findings, and merge when review and checks pass. Reinstall the exact merged artifact and repeat the installed-host smoke screenshots.
