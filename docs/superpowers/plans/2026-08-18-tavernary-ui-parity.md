# Tavernary UI Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Tavernary Companion's shared shell, discovery filters, project cards, lifecycle controls, Kit selection, TavernKeeper assessment, and responsive presentation so they use Tavernary's current component grammar and the approved card interaction contract.

**Architecture:** Keep Companion's existing catalog, lifecycle, inventory, Kit, and host boundaries. Replace presentation seams with small Preact components modeled on current Tavernary DOM/CSS: shared icon/navigation controls, data-driven filter controls, a stretched canonical-source card link with isolated lifecycle and Kit actions, and an anchored TavernKeeper popover. Container-responsive CSS remains owned by Companion, while exact values and state treatments come from Tavernary's tokens and catalog styles.

**Tech Stack:** TypeScript 6, Preact 10, Vitest, Testing Library, Playwright, CSS, esbuild.

**Spec:** `F:\git\TavernaryCompanion\docs\2026-08-18-tavernary-ui-parity-implementation-prompt.md`

## Global Constraints

- Current `F:\git\Tavernary` source is the visual authority; existing Companion screenshots are not acceptance authority.
- Preserve Companion trust, lifecycle, inventory, self-protection, Kit, popup containment, and browser-Back behavior.
- Card/title opens `canonicalUrl`; nested scan/install/Kit controls never activate that link.
- One stable supplied install lifecycle control toggles Install to confirmed Uninstall; `+`/`−` with visible `Kit` owns Kit selection.
- No large project `Details` action or generic centered assessment dump remains in the normal project flow.
- Use test-first red-green-refactor for every behavior change.
- Preserve unrelated primary-checkout changes; work only on `codex/tavernary-ui-parity` in the isolated worktree.

---

### Task 1: Canonical SVG vocabulary and navigation model

**Files:**
- Modify: `src/ui/shared/category-icon.tsx`
- Create: `src/ui/shared/install-icon.tsx`
- Create: `src/ui/shell/catalog-navigation.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Modify: `tests/unit/category-icon.test.tsx`
- Create: `tests/unit/catalog-navigation.test.tsx`
- Create: `tests/unit/install-icon.test.tsx`

**Interfaces:**
- Consumes: `CompanionRoute`, `CatalogQuery.category`, `CatalogQuery.kinds`.
- Produces: `CategoryIconName`; `InstallIcon(): preact.JSX.Element`; `CatalogNavigation({ route, query, onNavigate, onQueryChange })`.

- [ ] **Step 1: Add one failing install-icon test**

```tsx
render(<InstallIcon />);
const icon = screen.getByTestId("install-icon");
expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
expect(icon).toHaveAttribute("fill", "currentColor");
expect(icon.querySelector("path")?.getAttribute("d")).toBe(INSTALL_PATH_LITERAL);
```

- [ ] **Step 2: Run the install-icon test and verify the missing-module failure**

Run: `npm.cmd test -- tests/unit/install-icon.test.tsx`

Expected: FAIL because `src/ui/shared/install-icon.tsx` does not exist.

- [ ] **Step 3: Implement the normalized supplied SVG**

```tsx
export function InstallIcon(): preact.JSX.Element {
  return (
    <svg aria-hidden="true" data-testid="install-icon" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 2v2H5l-.001 10h14L19 4h-4V2h5a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5zm9.999 14h-14L5 20h14l-.001-4zM17 17v2h-2v-2h2zM13 2v5h3l-4 4-4-4h3V2h2z" />
    </svg>
  );
}
```

- [ ] **Step 4: Run the install-icon test and verify green**

Run: `npm.cmd test -- tests/unit/install-icon.test.tsx`

Expected: PASS.

- [ ] **Step 5: Add one failing category-icon parity test**

Render the upstream-required names `all`, `search`, `chevron`, `filter-lines`, `collapse`, `close`, `kit`, `add-to-kit`, and the existing project-kind/function names. Assert each produces an SVG with its own `data-icon`.

- [ ] **Step 6: Run the category-icon test and verify the first missing icon failure**

Run: `npm.cmd test -- tests/unit/category-icon.test.tsx`

Expected: FAIL because Companion's icon union and renderer omit upstream navigation/action names.

- [ ] **Step 7: Port the missing SVG branches from Tavernary**

Copy the exact path/shape geometry from `F:\git\Tavernary\src\components\icons\category-icon.tsx`, adapt React props to Preact, and keep `currentColor`, `viewBox`, and `data-icon` stable.

- [ ] **Step 8: Run the category-icon test and verify green**

Run: `npm.cmd test -- tests/unit/category-icon.test.tsx`

- [ ] **Step 9: Add one failing navigation behavior test**

```tsx
render(<CatalogNavigation route="projects" query={query} onNavigate={onNavigate} onQueryChange={onQueryChange} />);
await user.click(screen.getByRole("button", { name: "System Presets" }));
expect(onNavigate).toHaveBeenCalledWith("projects");
expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ category: "preset" }));
expect(screen.getByRole("img", { name: "System Presets" })).toBeInTheDocument();
```

Also cover Kits and Installed route activation and the mobile Browse trigger/menu without a native route `<select>`.

- [ ] **Step 10: Run the navigation test and verify the missing-component failure**

Run: `npm.cmd test -- tests/unit/catalog-navigation.test.tsx`

- [ ] **Step 11: Implement `CatalogNavigation` and replace `RouteTabs` usage**

Use Tavernary's `CategoryNavigation` DOM grammar. Keep Projects/Kits/Installed route semantics and map project category buttons to `onQueryChange`; implement a button-triggered mobile menu with `aria-expanded`, selected state, Escape/outside dismissal, and focus restoration.

- [ ] **Step 12: Run navigation, shell, and accessibility unit tests**

Run: `npm.cmd test -- tests/unit/catalog-navigation.test.tsx tests/unit/companion-shell.test.tsx tests/unit/accessibility.test.tsx`

- [ ] **Step 13: Commit Task 1**

```powershell
git add src/ui/shared/category-icon.tsx src/ui/shared/install-icon.tsx src/ui/shell/catalog-navigation.tsx src/ui/shell/companion-shell.tsx tests/unit/category-icon.test.tsx tests/unit/catalog-navigation.test.tsx tests/unit/install-icon.test.tsx
git commit -m "feat(ui): add Tavernary navigation icons"
```

### Task 2: Data-driven Tavernary filter controls

**Files:**
- Create: `src/ui/projects/filter-choice.tsx`
- Create: `src/ui/projects/filter-controls.tsx`
- Modify: `src/ui/projects/filter-panel.tsx`
- Modify: `src/ui/projects/active-filter-chips.tsx`
- Modify: `src/ui/projects/projects-route.tsx`
- Modify: `src/catalog/discovery-controller.ts`
- Modify: `tests/unit/projects-route.test.tsx`
- Create: `tests/unit/project-filters.test.tsx`
- Modify: `tests/unit/discovery-controller.test.ts`

**Interfaces:**
- Consumes: full catalog projects, `CatalogSnapshot.catalog.tagVocabulary`, `CatalogQuery`.
- Produces: facet options with `{ id, label, count, facet? }`; list and chip presentations; complete active-filter tokens.

- [ ] **Step 1: Add one failing facet-count test**

Build a real discovery controller with two catalog projects and assert `read().facets` exposes data-derived counts and tag facet metadata, not only labels.

```ts
expect(state.facets?.frontends).toContainEqual({ id: "sillytavern", label: "SillyTavern", count: 2 });
expect(state.facets?.tags).toContainEqual(expect.objectContaining({ id: "memory", facet: "capability", count: 1 }));
```

- [ ] **Step 2: Run the controller test and verify the shape mismatch**

Run: `npm.cmd test -- tests/unit/discovery-controller.test.ts`

- [ ] **Step 3: Extend the facet view model minimally**

Derive counts from the full catalog and carry authoritative tag facet data from `tagVocabulary`. Keep selectors/filter semantics unchanged.

- [ ] **Step 4: Run the controller test and verify green**

Run: `npm.cmd test -- tests/unit/discovery-controller.test.ts`

- [ ] **Step 5: Add one failing filter-presentation test**

Assert there is no Category combobox; `Compatible frontend`, `Project kind`, `Goals & traits`, `Model family`, `Completion format`, `Development`, and `License` appear in order; list groups use checkboxes; metadata/tag groups use Tavernary chip controls; counts are visible and accessible.

- [ ] **Step 6: Run the filter test and verify current raw-panel failure**

Run: `npm.cmd test -- tests/unit/project-filters.test.tsx`

- [ ] **Step 7: Implement focused filter primitives and rebuild `FilterPanel`**

Port Tavernary's selected-first chips, frontend search/preview, show-more disclosure, tag facet groups, model/completion vocabulary derived from catalog data, and list checkbox grammar. Delete the redundant Category select and static model/completion arrays.

- [ ] **Step 8: Run the filter test and verify green**

Run: `npm.cmd test -- tests/unit/project-filters.test.tsx`

- [ ] **Step 9: Add one failing complete active-query test**

Set one value in each query dimension, remove each chip, and assert the emitted query clears only that dimension. Assert `Clear all` keeps established search/sort behavior.

- [ ] **Step 10: Run and verify the active-query failure**

Run: `npm.cmd test -- tests/unit/projects-route.test.tsx`

- [ ] **Step 11: Implement complete active-query tokens and contained sheet behavior**

Keep the existing route-owned focus trap, Escape, inerting, focus restoration, and compact breakpoint behavior; change markup to upstream heading/controls and ensure the closed sheet is absent from the accessibility tree.

- [ ] **Step 12: Run project route/filter/accessibility tests**

Run: `npm.cmd test -- tests/unit/project-filters.test.tsx tests/unit/projects-route.test.tsx tests/unit/accessibility.test.tsx tests/unit/discovery-controller.test.ts`

- [ ] **Step 13: Commit Task 2**

```powershell
git add src/catalog/discovery-controller.ts src/ui/projects/filter-choice.tsx src/ui/projects/filter-controls.tsx src/ui/projects/filter-panel.tsx src/ui/projects/active-filter-chips.tsx src/ui/projects/projects-route.tsx tests/unit/discovery-controller.test.ts tests/unit/project-filters.test.tsx tests/unit/projects-route.test.tsx
git commit -m "refactor(ui): match Tavernary filters"
```

### Task 3: Canonical source link and install/Kit lifecycle controls

**Files:**
- Create: `src/ui/projects/project-kit-control.tsx`
- Create: `src/ui/projects/project-lifecycle-control.tsx`
- Modify: `src/ui/projects/project-card.tsx`
- Modify: `src/ui/projects/project-grid.tsx`
- Modify: `src/ui/projects/project-results-toolbar.tsx`
- Modify: `src/ui/projects/projects-route.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Modify: `tests/unit/project-card.test.tsx`
- Modify: `tests/unit/projects-route.test.tsx`
- Modify: `tests/unit/companion-shell.test.tsx`

**Interfaces:**
- Consumes: `ProjectCardViewModel.canonicalUrl`, `ProjectPrimaryAction`, Kit selection state.
- Produces: `ProjectLifecycleControl`; `ProjectKitControl`; first-click Kit activation-and-select behavior.

- [ ] **Step 1: Add one failing canonical-source test**

```tsx
const view = render(<ProjectCard project={project({ canonicalUrl: "https://example.test/repo" })} ... />);
const link = screen.getByRole("link", { name: /Alpha/ });
expect(link).toHaveAttribute("href", "https://example.test/repo");
expect(link).toHaveAttribute("target", "_blank");
expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
expect(screen.queryByRole("button", { name: /details/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run and verify current card fails because it has no canonical link and renders Details**

Run: `npm.cmd test -- tests/unit/project-card.test.tsx`

- [ ] **Step 3: Add `canonicalUrl` to the card view model**

Carry the already-authoritative URL from `CatalogProject` into `ProjectCardViewModel`; keep the detail view-model extension compatible.

- [ ] **Step 4: Implement the stretched semantic title link and remove Details**

Use a title anchor with a card-covering pseudo-element. Give nested controls a higher stacking context. Remove `onOpen` from `ProjectCard`/`ProjectGrid` and obsolete project-detail routing from project cards.

- [ ] **Step 5: Run the card test and verify green**

Run: `npm.cmd test -- tests/unit/project-card.test.tsx tests/unit/project-view-model.test.ts`

- [ ] **Step 6: Add one failing lifecycle-toggle test**

For `action.kind === "install"`, assert the supplied glyph, `aria-pressed="false"`, `Install Alpha`, and callback. Rerender with `action.kind === "uninstall"`, assert the same glyph/control position, `aria-pressed="true"`, `Uninstall Alpha`, and callback. Assert browse-only/self-protected states do not render the toggle.

- [ ] **Step 7: Run and verify lifecycle-toggle failure**

Run: `npm.cmd test -- tests/unit/project-card.test.tsx`

- [ ] **Step 8: Implement `ProjectLifecycleControl`**

Route callbacks through existing `onAction`; never bypass trust/confirmation. Use stable markup and state class, supplied icon, correct tooltip/title, disabled reason, and 44×44 hit target seam.

- [ ] **Step 9: Run and verify lifecycle-toggle green**

Run: `npm.cmd test -- tests/unit/project-card.test.tsx`

- [ ] **Step 10: Add one failing first-click Kit test**

Click `Add Alpha to Kit` while no selection is active and assert the shell selection state becomes `['alpha']` immediately. Assert visible `Kit`, plus/minus state, toggle removal, and absence of `Select for Kit`.

- [ ] **Step 11: Run and verify first-click Kit failure**

Run: `npm.cmd test -- tests/unit/projects-route.test.tsx tests/unit/companion-shell.test.tsx`

- [ ] **Step 12: Implement always-available `ProjectKitControl` and selection activation**

Replace the global mode button. Pass a single `onToggleKitSelection` callback that initializes selection with the clicked ID when null. Port upstream plus/minus face and add a visible `<small>Kit</small>` inside the semantic button.

- [ ] **Step 13: Run project card/route/shell tests**

Run: `npm.cmd test -- tests/unit/project-card.test.tsx tests/unit/project-view-model.test.ts tests/unit/projects-route.test.tsx tests/unit/companion-shell.test.tsx`

- [ ] **Step 14: Commit Task 3**

```powershell
git add src/catalog/project-view-model.ts src/ui/projects/project-kit-control.tsx src/ui/projects/project-lifecycle-control.tsx src/ui/projects/project-card.tsx src/ui/projects/project-grid.tsx src/ui/projects/project-results-toolbar.tsx src/ui/projects/projects-route.tsx src/ui/shell/companion-shell.tsx tests/unit/project-card.test.tsx tests/unit/project-view-model.test.ts tests/unit/projects-route.test.tsx tests/unit/companion-shell.test.tsx
git commit -m "feat(ui): separate source install and Kit actions"
```

### Task 4: TavernKeeper scan popover and obsolete detail removal

**Files:**
- Create: `src/ui/projects/tavernkeeper-scan-indicator.tsx`
- Create: `src/ui/projects/tavernkeeper-history-strip.tsx`
- Modify: `src/ui/projects/project-card.tsx`
- Modify: `src/ui/shared/assessment-badge.tsx` or remove it if unused
- Modify/remove: `src/ui/projects/project-detail.tsx`
- Modify/remove: `src/ui/projects/project-evidence.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Create: `tests/unit/tavernkeeper-scan-indicator.test.tsx`
- Modify: `tests/unit/project-card.test.tsx`
- Modify/remove: `tests/unit/project-detail.test.tsx`

**Interfaces:**
- Consumes: `ProjectCardViewModel.tavernKeeper`, project ID/name, report/source URLs.
- Produces: compact controlled scan popover with focus restoration and safe links.

- [ ] **Step 1: Add one failing current-scan popover test**

Render a real current report, activate `TavernKeeper scan: Low concern · current scan`, and assert heading, summary, literal finding counts, scanned SHA, full-report link, safe target/rel, and `aria-expanded="true"`.

- [ ] **Step 2: Run and verify missing popover failure**

Run: `npm.cmd test -- tests/unit/tavernkeeper-scan-indicator.test.tsx`

- [ ] **Step 3: Implement the minimal current-scan popover**

Port upstream accessible language and DOM hierarchy; derive content only from existing report fields.

- [ ] **Step 4: Run and verify current-scan green**

Run: `npm.cmd test -- tests/unit/tavernkeeper-scan-indicator.test.tsx`

- [ ] **Step 5: Add one failing interaction/state test**

Cover unassessed, unsupported, stale/current states; outside click; Escape; focus restoration; history links; and event isolation from the stretched card link, one behavior per red-green cycle.

- [ ] **Step 6: Implement each missing state/interaction incrementally**

Use document listeners only while open, unique IDs, `aria-controls`, collision-safe CSS seams, and no fabricated data.

- [ ] **Step 7: Run scan and card tests**

Run: `npm.cmd test -- tests/unit/tavernkeeper-scan-indicator.test.tsx tests/unit/project-card.test.tsx`

- [ ] **Step 8: Remove obsolete project-detail entry points**

Keep Kit inspector Back behavior. Route Installed source access directly to canonical links and lifecycle controls; delete project detail/evidence components only after their callers and tests are gone.

- [ ] **Step 9: Run shell, Installed, card, and Back-navigation tests**

Run: `npm.cmd test -- tests/unit/companion-shell.test.tsx tests/unit/installed-route.test.tsx tests/unit/project-card.test.tsx tests/unit/shell-controller.test.ts`

- [ ] **Step 10: Commit Task 4**

```powershell
git add -A src/ui/projects src/ui/shared/assessment-badge.tsx src/ui/shell/companion-shell.tsx tests/unit
git commit -m "feat(ui): add TavernKeeper scan popover"
```

### Task 5: One-to-one catalog CSS and responsive composition

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/shell.css`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/styles/kits.css`
- Modify: `src/styles/lifecycle.css`
- Modify: `tests/e2e/brand-alignment.spec.ts`
- Modify: `tests/e2e/shell-responsive.spec.ts`

**Interfaces:**
- Consumes: stable DOM/class seams from Tasks 1–4.
- Produces: Tavernary-equivalent computed styles and container-responsive geometry.

- [ ] **Step 1: Add one failing desktop geometry assertion**

Assert canonical header/search/nav surfaces, flush 238px filter rail, card grid gap, card padding/radius/shadow, and bottom-right lifecycle/Kit cluster placement at 1440×960.

- [ ] **Step 2: Run the focused Playwright test and verify the geometry mismatch**

Run: `npx.cmd playwright test tests/e2e/brand-alignment.spec.ts --project=chromium --grep "desktop parity"`

- [ ] **Step 3: Port exact desktop selectors/values from Tavernary**

Map `.site-header`, `.category-navigation`, `.catalog-layout`, `.filter-panel`, `.catalog-toolbar`, `.project-grid`, `.project-card`, `.card-*`, `.project-kit-control*`, and `.tavernkeeper-*` values into scoped Companion selectors. Remove superseded rules rather than layering contradictory overrides.

- [ ] **Step 4: Rerun desktop parity and verify green**

Run the command from Step 2.

- [ ] **Step 5: Add one failing mobile composition assertion**

At 390×844, assert brand/actions row, search row, Browse row, compact toolbar, first card `y <= 400`, one-column cards, contained filter sheet/popover, 44×44 targets, and zero overflow.

- [ ] **Step 6: Run the mobile test and verify failure**

Run: `npx.cmd playwright test tests/e2e/shell-responsive.spec.ts --project=chromium --grep "mobile parity"`

- [ ] **Step 7: Port/adapt responsive rules to the Companion container**

Use container measurements already owned by the root where viewport media queries would be wrong inside SillyTavern. Preserve reduced motion, 320–360px fallback, 200% text, and one scroll owner.

- [ ] **Step 8: Rerun desktop/mobile focused Playwright tests**

Run: `npx.cmd playwright test tests/e2e/brand-alignment.spec.ts tests/e2e/shell-responsive.spec.ts --project=chromium`

- [ ] **Step 9: Run unit/type checks for the new DOM seams**

Run: `npm.cmd run typecheck` and `npm.cmd test -- tests/unit/accessibility.test.tsx tests/unit/companion-shell.test.tsx tests/unit/project-card.test.tsx tests/unit/projects-route.test.tsx`

- [ ] **Step 10: Commit Task 5**

```powershell
git add src/styles tests/e2e/brand-alignment.spec.ts tests/e2e/shell-responsive.spec.ts
git commit -m "refactor(ui): port Tavernary catalog composition"
```

### Task 6: Kits, Installed, and lifecycle family alignment

**Files:**
- Modify: components under `src/ui/kits/`
- Modify: components under `src/ui/installed/`
- Modify: components under `src/ui/lifecycle/`
- Modify: `src/styles/kits.css`
- Modify: `src/styles/lifecycle.css`
- Modify: relevant `tests/unit/*kit*.test.tsx`, `tests/unit/installed-route.test.tsx`, and lifecycle UI tests
- Modify: `tests/e2e/kit-switching.spec.ts`

**Interfaces:**
- Consumes: shared Tavernary tokens/buttons/navigation and Kit selection state from earlier tasks.
- Produces: same-family cards/rows/dialogs without changing domain operations.

- [ ] **Step 1: Add one failing Kit/Installed semantic regression test**

Replace obsolete Details-driven expectations with canonical source links, stable lifecycle controls, and the Kit selection dock state. Assert existing activation, review, and Installed management callbacks still fire.

- [ ] **Step 2: Run and verify the obsolete interaction failure**

Run: `npm.cmd test -- tests/unit/kits-route.test.tsx tests/unit/installed-route.test.tsx tests/unit/lifecycle-ui.test.tsx`

- [ ] **Step 3: Adapt components to shared controls and source-link behavior**

Keep data flow untouched; remove duplicated generic button/card patterns where shared Tavernary controls now exist.

- [ ] **Step 4: Run and verify unit green**

Run the command from Step 2 plus `npm.cmd test -- tests/unit/kit-inspector.test.tsx tests/unit/kit-editor.test.tsx`.

- [ ] **Step 5: Add one failing Playwright flow for Kit selection and Installed source access**

Assert first card `+ Kit` starts selection, Details is absent, review/cancel still work, and Installed source link/lifecycle actions remain operable.

- [ ] **Step 6: Run and verify Playwright red**

Run: `npx.cmd playwright test tests/e2e/kit-switching.spec.ts --project=chromium`

- [ ] **Step 7: Finish styles/flows and rerun Playwright green**

Run the same command, then `npm.cmd test -- tests/unit/lifecycle-ui.test.tsx tests/unit/kit-operation-ui.test.tsx tests/unit/kit-preflight-ui.test.tsx`.

- [ ] **Step 8: Commit Task 6**

```powershell
git add src/ui/kits src/ui/installed src/ui/lifecycle src/styles/kits.css src/styles/lifecycle.css tests/unit tests/e2e/kit-switching.spec.ts
git commit -m "refactor(ui): align Companion operation surfaces"
```

### Task 7: Visual baselines, full verification, and packaged proof

**Files:**
- Modify: `tests/e2e/responsive-conformance.spec.ts`
- Modify/add: snapshots under `tests/e2e/responsive-conformance.spec.ts-snapshots/`
- Regenerate: `dist/companion.css`
- Regenerate: `dist/extension.js`

**Interfaces:**
- Consumes: completed source and deterministic harness fixtures.
- Produces: reviewed screenshots, zero-overflow proof, full passing gate, release package verification.

- [ ] **Step 1: Extend deterministic screenshot coverage**

Cover Projects at 390×844, 412×915, 1024×768, 1440×960; mobile filters; TavernKeeper popover; active `+ Kit` selection; Kits; Installed; and one lifecycle/trust surface.

- [ ] **Step 2: Run visual tests without updating and inspect every failure**

Run: `npx.cmd playwright test tests/e2e/responsive-conformance.spec.ts --project=chromium`

Expected: snapshot mismatches against the obsolete baselines.

- [ ] **Step 3: Capture reviewed baselines only after geometry/interaction assertions pass**

Run: `npx.cmd playwright test tests/e2e/responsive-conformance.spec.ts --project=chromium --update-snapshots`

Inspect each PNG directly; do not accept clipping, centered detail dumps, ambiguous controls, or structural drift.

- [ ] **Step 4: Run focused full UI coverage**

Run: `npx.cmd playwright test tests/e2e/brand-alignment.spec.ts tests/e2e/shell-responsive.spec.ts tests/e2e/shell-accessibility.spec.ts tests/e2e/kit-switching.spec.ts tests/e2e/responsive-conformance.spec.ts --project=chromium`

- [ ] **Step 5: Run the complete repository gate**

Run: `npm.cmd run check`

- [ ] **Step 6: Run the full Playwright suite**

Run: `npm.cmd run test:e2e`

- [ ] **Step 7: Build and verify release artifacts**

Run: `npm.cmd run release:package` and `npm.cmd run release:verify`.

- [ ] **Step 8: Review final status and diff**

Run: `git status --short`, `git diff --check`, `git diff --stat`, and inspect staged/source diff without including unrelated files.

- [ ] **Step 9: Commit verified baselines/artifacts**

```powershell
git add tests/e2e/responsive-conformance.spec.ts tests/e2e/responsive-conformance.spec.ts-snapshots dist/companion.css dist/extension.js
git commit -m "test(ui): certify Tavernary parity pass"
```

- [ ] **Step 10: Perform installed-host proof only if the configured local SillyTavern instance and safe install workflow are available**

Record the exact packaged artifact, installed path, viewport, console/page/network results, and screenshots separately from fixture proof. Do not fabricate or imply installed-host verification when unavailable.
