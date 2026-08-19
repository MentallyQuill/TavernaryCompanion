# Tavernary Responsive Conformance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Tavernary Companion's responsive shell and catalog presentation so mobile follows Tavernary.org's hierarchy and density while desktop uses the same component grammar inside the SillyTavern overlay.

**Architecture:** Keep one semantic Preact component tree and expose narrow presentation seams for a desktop tablist and mobile Browse selector. Move project search into the shared header, consolidate results controls, retain a single route scroller, and certify deterministic layouts with Playwright geometry and screenshot assertions.

**Tech Stack:** TypeScript, Preact, CSS container queries and media queries, Vitest, Testing Library, Playwright, esbuild.

**Spec:** `docs/superpowers/specs/2026-08-18-tavernary-responsive-conformance-design.md`

## Global Constraints

- Tavernary.org mobile at `390x844` and `412x915` is the primary visual authority.
- Desktop must read as the same component family at `1024x768` and `1440x960`.
- Keep one semantic component tree; do not fork separate mobile and desktop applications.
- Mobile Projects must place the first deterministic fixture card at or above `400px`.
- Coarse-pointer controls must expose at least `44x44px` hit targets.
- Preserve lifecycle, trust, self-protection, inventory, Kit, focus-restoration, and Back behavior.
- Keep the shell parent-constrained with no document, shell, route, or card horizontal overflow.
- Use deterministic local screenshots for regression; do not compare pixels against live Tavernary.org in CI.
- Preserve unrelated working-tree changes and never reset or force-push the active checkout.

---

### Task 1: Unify header search and responsive route navigation

**Files:**
- Modify: `src/ui/shell/shell-header.tsx`
- Modify: `src/ui/shell/route-tabs.tsx`
- Modify: `src/ui/shell/companion-shell.tsx`
- Modify: `src/styles/shell.css`
- Modify: `src/styles/responsive.css`
- Modify: `tests/unit/companion-shell.test.tsx`
- Modify: `tests/e2e/brand-alignment.spec.ts`

**Interfaces:**
- `ShellHeader` consumes optional `search: { value: string; onChange(value: string): void }`.
- `RouteTabs` retains `route: CompanionRoute` and `onNavigate(route: CompanionRoute): void`.
- `CompanionShell` supplies search only for the Projects list route and resets `visibleProjectCount` before updating the discovery query.

- [ ] **Step 1: Write failing unit tests for header search and mobile route selection**

Add assertions equivalent to:

```tsx
expect(screen.getByRole("searchbox", { name: "Search projects" })).toHaveValue("");
fireEvent.input(screen.getByRole("searchbox", { name: "Search projects" }), {
  target: { value: "memory" },
});
expect(discovery.read().query.search).toBe("memory");

fireEvent.change(screen.getByRole("combobox", { name: "Browse Companion" }), {
  target: { value: "kits" },
});
expect(screen.getByRole("heading", { name: "Kits" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/companion-shell.test.tsx`

Expected: FAIL because search remains inside `ProjectsRoute` and no Browse selector exists.

- [ ] **Step 3: Add the shared-header search contract**

Extend `ShellHeaderProps` and render the field between brand and utilities:

```tsx
interface HeaderSearch {
  value: string;
  onChange(value: string): void;
}

interface ShellHeaderProps {
  search?: HeaderSearch;
  onRequestClose?: () => void;
  catalogSnapshot?: CatalogSnapshot;
  catalogRefreshing?: boolean;
  onRefreshCatalog?: () => void;
}

{search ? (
  <label class="tavernary-companion-header-search">
    <span class="tavernary-companion-visually-hidden">Search projects</span>
    <input
      type="search"
      aria-label="Search projects"
      placeholder="Search projects or creators…"
      value={search.value}
      onInput={(event) => search.onChange(event.currentTarget.value)}
    />
  </label>
) : null}
```

In `CompanionShell`, define one query update function and pass it to both the header and Projects route:

```tsx
const updateProjectQuery = (query: CatalogQuery) => {
  setVisibleProjectCount(INITIAL_PROJECT_COUNT);
  discovery?.setQuery(query);
};

const projectSearch =
  !detail && state.route === "projects" && discoveryState
    ? {
        value: discoveryState.query.search,
        onChange: (search: string) =>
          updateProjectQuery({ ...discoveryState.query, search }),
      }
    : undefined;
```

- [ ] **Step 4: Add desktop tabs and the mobile Browse selector**

Keep the tablist for desktop and add a labeled select in the same navigation component:

```tsx
<label class="tavernary-companion-route-select">
  <span>Browse</span>
  <select
    aria-label="Browse Companion"
    value={route}
    onChange={(event) => onNavigate(event.currentTarget.value as CompanionRoute)}
  >
    {routes.map(({ id, label }) => (
      <option value={id}>{label}</option>
    ))}
  </select>
</label>
```

Desktop CSS hides `.tavernary-companion-route-select`. Mobile CSS hides the tablist and displays the selector as Tavernary's compact Browse row.

- [ ] **Step 5: Recompose header geometry**

Use a desktop grid of `auto minmax(16rem, 1fr) auto`, cap the brand copy, and place search in the available center column. At mobile width, use two columns for brand/utilities and put search in `grid-column: 1 / -1` on the second row. Replace the labeled Refresh button visually with a compact icon treatment while retaining `aria-label="Refresh catalog"`.

- [ ] **Step 6: Run focused unit and browser tests**

Run: `npm.cmd test -- tests/unit/companion-shell.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/brand-alignment.spec.ts`

Expected: PASS with desktop tabs, mobile selector, and header-owned project search.

- [ ] **Step 7: Commit the shell slice**

```bash
git add src/ui/shell/shell-header.tsx src/ui/shell/route-tabs.tsx src/ui/shell/companion-shell.tsx src/styles/shell.css src/styles/responsive.css tests/unit/companion-shell.test.tsx tests/e2e/brand-alignment.spec.ts
git commit -m "refactor(ui): unify responsive shell"
```

### Task 2: Consolidate Projects controls and filter behavior

**Files:**
- Create: `src/ui/projects/project-results-toolbar.tsx`
- Modify: `src/ui/projects/projects-route.tsx`
- Delete: `src/ui/projects/search-toolbar.tsx`
- Modify: `src/ui/projects/filter-panel.tsx`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`
- Modify: `tests/unit/projects-route.test.tsx`
- Modify: `tests/e2e/shell-responsive.spec.ts`

**Interfaces:**
- `ProjectResultsToolbar` consumes `query: CatalogQuery`, `resultCount: number`, `filtersOpen: boolean`, `kitSelectionActive: boolean`, `onQueryChange(query)`, `onOpenFilters()`, `onClearFilters()`, and `onBeginKitSelection()`.
- `ProjectsRoute` continues to own filter-sheet state and focus restoration.
- Search is no longer rendered by `ProjectsRoute`.

- [ ] **Step 1: Write failing route tests for the compact result controls**

Assert the new composition:

```tsx
expect(screen.queryByRole("heading", { name: "Projects" })).not.toBeInTheDocument();
expect(screen.queryByText(/Showing SillyTavern extensions/)).not.toBeInTheDocument();
expect(screen.queryByRole("searchbox", { name: "Search projects" })).not.toBeInTheDocument();
expect(screen.getByText("1 project")).toBeInTheDocument();
expect(screen.getByRole("combobox", { name: "Sort projects" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Filters" })).toHaveAttribute("aria-expanded", "false");
```

Keep the Escape/focus-restoration test and add `expect(dialog).not.toBeVisible()` before opening it.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/unit/projects-route.test.tsx`

Expected: FAIL on the redundant heading, default-scope copy, route-owned search, and always-laid-out filter surface.

- [ ] **Step 3: Create `ProjectResultsToolbar`**

Render one dense control group:

```tsx
export function ProjectResultsToolbar(props: ProjectResultsToolbarProps) {
  return (
    <div class="tavernary-companion-results-toolbar">
      <output aria-live="polite">
        {props.resultCount} {props.resultCount === 1 ? "project" : "projects"}
      </output>
      <select
        aria-label="Sort projects"
        value={props.query.sort}
        onChange={(event) =>
          props.onQueryChange({ ...props.query, sort: event.currentTarget.value as CatalogSort })
        }
      >
        {sorts.map(({ id, label }) => (
          <option value={id}>{label}</option>
        ))}
      </select>
      <button type="button" aria-label="Filters" aria-expanded={props.filtersOpen} onClick={props.onOpenFilters}>
        Filters
      </button>
      <button type="button" onClick={props.onBeginKitSelection} disabled={props.kitSelectionActive}>
        Select for Kit
      </button>
    </div>
  );
}
```

Keep sort labels identical to the existing component. Add a clear action only when the query differs from the all-projects query.

- [ ] **Step 4: Reorder `ProjectsRoute`**

Render advisory text, `ProjectResultsToolbar`, active chips, and workspace in that order. Remove the route heading, explanatory paragraph, and `SearchToolbar`. Keep an offscreen route heading only if required by the containing section's `aria-labelledby` contract.

Use this advisory copy:

```tsx
<p class="tavernary-companion-catalog-advisory">
  TavernKeeper provides evidence, not a guarantee of safety. Review projects before installing.
</p>
```

- [ ] **Step 5: Make compact filters a true fixed sheet**

When closed, apply `hidden={!filtersOpen && compact}` through a responsive-safe markup strategy or keep `display: none` plus `aria-hidden`/`inert`. When open, render a backdrop and sheet constrained to the Companion shell, trap focus, dismiss on Escape/backdrop, and restore focus to Filters. Keep the persistent desktop rail visible without dialog semantics.

- [ ] **Step 6: Add the first-card geometry assertion**

In `shell-responsive.spec.ts`, assert:

```ts
await page.setViewportSize({ width: 390, height: 844 });
await openHarness(page);
const firstCard = await page.locator(".tavernary-companion-project-card").first().boundingBox();
expect(firstCard).not.toBeNull();
expect(firstCard!.y).toBeLessThanOrEqual(400);
```

Also assert one mobile column, a visible Browse selector, a visible header search, and no route-level search field.

- [ ] **Step 7: Run focused tests**

Run: `npm.cmd test -- tests/unit/projects-route.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/shell-responsive.spec.ts`

Expected: PASS with the first card at or above `400px` and preserved filter focus behavior.

- [ ] **Step 8: Commit the Projects composition slice**

```bash
git add src/ui/projects/project-results-toolbar.tsx src/ui/projects/projects-route.tsx src/ui/projects/filter-panel.tsx src/styles/projects.css src/styles/responsive.css tests/unit/projects-route.test.tsx tests/e2e/shell-responsive.spec.ts
git rm src/ui/projects/search-toolbar.tsx
git commit -m "refactor(ui): compact catalog controls"
```

### Task 3: Match Tavernary card density and action hierarchy

**Files:**
- Modify: `src/ui/projects/project-card.tsx`
- Modify: `src/ui/shared/activity-summary.tsx`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`
- Modify: `tests/unit/project-card.test.tsx`
- Modify: `tests/e2e/brand-alignment.spec.ts`

**Interfaces:**
- `ProjectCard` keeps its current props and lifecycle callbacks.
- `ActivitySummary` keeps `activity: ProjectCardViewModel["activity"]`.
- Install uses a square orange compact action; destructive or ambiguous actions retain visible text.

- [ ] **Step 1: Write failing card structure and accessibility tests**

Assert that Install remains named while using compact chrome:

```tsx
const install = screen.getByRole("button", { name: "Install Alpha" });
expect(install).toHaveClass("tavernary-companion-project-card__compact-action");
expect(install).toHaveTextContent("+");
expect(screen.getByRole("button", { name: "View Alpha details" })).toBeInTheDocument();
expect(screen.getByText("Activity")).toBeInTheDocument();
expect(screen.queryByText(/of 12 active weeks/)).not.toBeInTheDocument();
```

Add a separate uninstall fixture asserting a visible `Uninstall` label rather than a glyph-only destructive action.

- [ ] **Step 2: Run the focused card tests and verify RED**

Run: `npm.cmd test -- tests/unit/project-card.test.tsx`

Expected: FAIL because card actions use a large two-button footer and Activity exposes the verbose ratio.

- [ ] **Step 3: Recompose card metadata**

Keep kind and Activity on the top row. Move project title, assessment, attribution, summary, chips, and license into Tavernary's compact scan order. Render Details as a compact secondary action with `aria-label={\`View ${project.name} details\`}`.

For safe compact actions:

```tsx
const compactInstall = project.action.kind === "install";

<button
  class={`tavernary-companion-project-card__primary tavernary-companion-button ${
    compactInstall ? "tavernary-companion-project-card__compact-action" : actionClass
  }`}
  aria-label={`${project.action.label} ${project.name}`}
>
  {compactInstall ? <span aria-hidden="true">+</span> : project.action.label}
</button>
```

- [ ] **Step 4: Simplify visible activity without deleting evidence**

Render `Activity` plus the twelve-week strip and preserve the detailed count/dormancy in an accessible label or title:

```tsx
<span
  class="tavernary-companion-activity-summary"
  aria-label={`Activity: ${activity.activeWeeks12} of 12 active weeks${activity.dormant ? ", dormant" : ""}`}
>
  <b aria-hidden="true">Activity</b>
  <ActivityStrip weeks={activity.weeklyActivity} />
</span>
```

- [ ] **Step 5: Apply Tavernary card rhythm**

Use compact padding, tighter line height, top-aligned three-column grids, consistent dividers, bounded summaries, and chips matching production density. Keep `44x44px` hit areas for mobile compact actions. Do not force cards to equal row height when content differs.

- [ ] **Step 6: Add rendered density assertions**

At `1440x960`, assert the grid has three distinct card x positions and the first card begins immediately below the result controls. At `390x844`, assert one x position, card width within the route, compact action at least `44x44px`, and no card overflow.

- [ ] **Step 7: Run focused tests**

Run: `npm.cmd test -- tests/unit/project-card.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/brand-alignment.spec.ts tests/e2e/shell-responsive.spec.ts`

Expected: PASS with compact Tavernary card hierarchy and preserved accessible lifecycle labels.

- [ ] **Step 8: Commit the card slice**

```bash
git add src/ui/projects/project-card.tsx src/ui/shared/activity-summary.tsx src/styles/projects.css src/styles/responsive.css tests/unit/project-card.test.tsx tests/e2e/brand-alignment.spec.ts tests/e2e/shell-responsive.spec.ts
git commit -m "refactor(ui): match Tavernary card rhythm"
```

### Task 4: Bring Kits and Installed into the shared responsive grammar

**Files:**
- Modify: `src/ui/kits/kits-route.tsx`
- Modify: `src/ui/installed/installed-route.tsx`
- Modify: `src/styles/kits.css`
- Modify: `src/styles/projects.css`
- Modify: `src/styles/responsive.css`
- Modify: `tests/unit/kits-route.test.tsx`
- Modify: `tests/unit/installed-route.test.tsx`
- Modify: `tests/e2e/brand-alignment.spec.ts`

**Interfaces:**
- Existing route props and controller APIs remain unchanged.
- Both routes use `.tavernary-companion-route-toolbar` and shared compact action classes.
- Published/Personal remains a semantic tablist below the global Browse selector.

- [ ] **Step 1: Write failing tests for compact route headers**

Assert Kits exposes one compact toolbar, source tabs, and search without an oversized description block. Assert Installed exposes a compact count/status header and dense sections.

```tsx
expect(screen.getByRole("tablist", { name: "Kit sources" })).toBeInTheDocument();
expect(screen.getByRole("searchbox", { name: "Search Kits" })).toBeInTheDocument();
expect(screen.queryByText("Save, install, and switch extension collections.")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/unit/kits-route.test.tsx tests/unit/installed-route.test.tsx`

Expected: FAIL on the current oversized Kits heading/description composition.

- [ ] **Step 3: Apply shared route toolbars**

Use compact headers:

```tsx
<header class="tavernary-companion-route-toolbar">
  <strong>Kits</strong>
  <span>{state.visible.length} shown</span>
  <div class="tavernary-companion-route-actions">
    <button type="button" onClick={onNewKit}>New Kit</button>
    <button type="button" onClick={onImport}>Import</button>
  </div>
</header>
```

Installed uses the same class with `Installed extensions` and the refresh status. Preserve headings through a visually hidden `h2` when necessary for the route's label relationship.

- [ ] **Step 4: Recompose mobile Kits and Installed**

Put Published/Personal and Kit search directly below the Browse selector, collapse filters into the same sheet grammar as Projects, and render one card column. Render Installed as dense rows with actions aligned to the trailing edge and wrapping only below `360px` or at 200% text.

- [ ] **Step 5: Verify route changes in Playwright**

At `390x844`, navigate using `Browse Companion` to Kits and Installed. Assert the selector value, visible route controls, first route item in the viewport, no horizontal overflow, and `44x44px` action targets. At `1440x960`, assert the desktop tablist remains the navigation surface.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/kits-route.test.tsx tests/unit/installed-route.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/brand-alignment.spec.ts`

Expected: PASS with one responsive grammar across all primary routes.

- [ ] **Step 7: Commit the route slice**

```bash
git add src/ui/kits/kits-route.tsx src/ui/installed/installed-route.tsx src/styles/kits.css src/styles/projects.css src/styles/responsive.css tests/unit/kits-route.test.tsx tests/unit/installed-route.test.tsx tests/e2e/brand-alignment.spec.ts
git commit -m "refactor(ui): align companion routes"
```

### Task 5: Certify deterministic visual conformance

**Files:**
- Create: `tests/e2e/responsive-conformance.spec.ts`
- Create: `tests/e2e/responsive-conformance.spec.ts-snapshots/*.png`
- Modify: `playwright.config.ts`
- Modify: `tests/e2e/shell-accessibility.spec.ts`
- Modify: `docs/implementation/evidence/companion-installed-v1.md`

**Interfaces:**
- Playwright owns deterministic local screenshot baselines.
- Live Tavernary.org captures remain a manual review input and are not required by CI.

- [ ] **Step 1: Add the conformance matrix tests**

Cover Projects at all four target viewports and filters/Kits/Installed at mobile and desktop. Use stable masks only for timestamps whose value is not deterministic.

```ts
for (const viewport of [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 1024, height: 768 },
  { width: 1440, height: 960 },
]) {
  test(`Projects conforms at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openHarness(page);
    await expect(page).toHaveScreenshot(`projects-${viewport.width}x${viewport.height}.png`, {
      animations: "disabled",
      caret: "hide",
    });
  });
}
```

- [ ] **Step 2: Add geometry and interaction assertions**

Assert DOM order, first-card y, column count, route navigation mode, filter sheet focus/close/restore, detail Back restoration, coarse-pointer hit sizes, 200% text, reduced motion, and zero overflow. Capture console errors, page errors, and failed requests and require empty arrays.

- [ ] **Step 3: Generate and inspect baselines**

Run: `npm.cmd run test:e2e -- tests/e2e/responsive-conformance.spec.ts --update-snapshots`

Expected: new deterministic PNG baselines. Inspect every image; do not accept a baseline merely because the test runner generated it.

- [ ] **Step 4: Run the complete verification gate**

Run: `npm.cmd run format:check`

Run: `npm.cmd run lint`

Run: `npm.cmd run typecheck`

Run: `npm.cmd test`

Run: `npm.cmd run build`

Run: `npm.cmd run test:e2e`

Run: `npm.cmd run release:verify`

Run: `git diff --check`

Expected: every command exits `0`; the full Playwright suite passes without updating snapshots.

- [ ] **Step 5: Update implementation evidence**

Record the target viewports, Playwright commands, screenshot names, geometry results, and whether installed SillyTavern proof was available. Distinguish harness proof from installed-host proof.

- [ ] **Step 6: Commit visual certification**

```bash
git add tests/e2e/responsive-conformance.spec.ts tests/e2e/responsive-conformance.spec.ts-snapshots playwright.config.ts tests/e2e/shell-accessibility.spec.ts docs/implementation/evidence/companion-installed-v1.md
git commit -m "test(ui): certify responsive conformance"
```

- [ ] **Step 7: Integrate and push `main` safely**

Use GitHub CLI with network permission to verify authentication and the authoritative remote branch. If remote `main` advanced, fetch and integrate without resetting or force-pushing. Rerun the full gate after integration, then push:

```bash
gh auth status
gh repo view --json nameWithOwner,url,defaultBranchRef
git fetch origin main
git rebase origin/main
npm.cmd run check
npm.cmd run test:e2e
git push origin main
```

Expected: local `HEAD`, `origin/main`, and the GitHub API commit SHA match; the working tree contains no task-owned changes.
