# Responsive Shell and Catalog UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Directive-inspired, Tavernary-neutral overlay with complete Projects and Installed browsing behavior across desktop, tablet, and mobile.

**Architecture:** A single Preact `CompanionShell` consumes immutable controller snapshots and dispatches typed intents. CSS container queries and semantic tokens own layout; JavaScript owns route history, focus restoration, sheets/dialogs, and operation-layer state. Catalog components receive view models and never call host or fetch APIs.

**Tech Stack:** Preact, TypeScript, CSS container queries and dynamic viewport units, Testing Library, axe-core, Playwright.

**Spec:** `docs/design/01-product-experience.md`; `docs/design/02-responsive-shell-and-visual-system.md`; `docs/design/03-catalog-discovery.md`

## Global Constraints

- Use text descriptions and implemented browser UI; no image mockup assets.
- Desktop shell starts at `min(92vw, 1440px)` by `min(90dvh, 960px)`.
- Breakpoints: wide above 1200px, standard 900–1199px, compact tablet 720–899px, mobile below 720px.
- Mobile becomes a safe-area-aware full-height sheet.
- Search, route, selected detail, scroll, and focus survive nested navigation.
- Every status has text or an accessible name; color is never the only signal.
- Assessment colors are gray/neutral, teal/low concern, orange/material concern, and red/immediate danger.
- Reduced motion removes nonessential transitions without removing state feedback.

---

### Task 1: Implement the shell state and route stack

**Files:**
- Create: `src/ui/shell/shell-state.ts`
- Create: `src/ui/shell/shell-controller.ts`
- Create: `src/ui/shell/companion-shell.tsx`
- Create: `src/ui/shell/shell-header.tsx`
- Create: `src/ui/shell/route-tabs.tsx`
- Modify: `src/ui/popup-host.tsx`
- Test: `tests/unit/shell-controller.test.ts`
- Test: `tests/unit/companion-shell.test.tsx`

**Interfaces:**
- Consumes: `DiscoveryController`, `CatalogClient`, `ProfileStore`, and popup close callback.
- Produces: routes `projects`, `kits`, `installed`; nested detail history; opener/detail focus restoration; shell intents.

- [ ] **Step 1: Write failing navigation tests**

```tsx
it("restores the originating card after closing project detail", async () => {
  render(<CompanionShell services={services} />);
  const card = screen.getByRole("button", { name: "View Alpha" });
  card.focus();
  await user.click(card);
  await user.click(screen.getByRole("button", { name: "Back" }));
  expect(card).toHaveFocus();
});
```

Add tests for route-tab history reset, mobile Back integration, close restoring popup opener, and active route persistence without persisting detail history.

- [ ] **Step 2: Run focused tests and observe missing-shell failures**

Run: `npm.cmd test -- tests/unit/shell-controller.test.ts tests/unit/companion-shell.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement route state**

```ts
export interface ShellState {
  route: "projects" | "kits" | "installed";
  detailStack: Array<{ kind: "project" | "kit"; id: string; focusKey: string }>;
  filterSurface: "closed" | "rail" | "sheet";
  operationLayer: "closed" | "progress" | "receipt";
}
```

Use a reducer with explicit events. Reject Back when all nested surfaces are closed; in that state the host popup owns close behavior.

- [ ] **Step 4: Render semantic shell anatomy**

Use one `section` labeled by the product heading, `nav` for route tabs, `header` utilities, `main` workspace, and portal layers for sheets/dialogs. Search and header remain sticky inside the shell scroll container.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/shell-controller.test.ts tests/unit/companion-shell.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/ui/shell src/ui/popup-host.tsx tests/unit/shell-controller.test.ts tests/unit/companion-shell.test.tsx
git commit -m "feat(ui): add Companion shell"
```

### Task 2: Implement search, filters, sorting, and result cards

**Files:**
- Create: `src/ui/projects/projects-route.tsx`
- Create: `src/ui/projects/search-toolbar.tsx`
- Create: `src/ui/projects/filter-panel.tsx`
- Create: `src/ui/projects/active-filter-chips.tsx`
- Create: `src/ui/projects/project-grid.tsx`
- Create: `src/ui/projects/project-card.tsx`
- Create: `src/ui/shared/assessment-badge.tsx`
- Create: `src/ui/shared/activity-summary.tsx`
- Test: `tests/unit/projects-route.test.tsx`
- Test: `tests/unit/project-card.test.tsx`

**Interfaces:**
- Consumes: `DiscoveryState` and intents `setSearch`, `setFilter`, `clearFilter`, `setSort`, `openProject`, and lifecycle action intents.
- Produces: visible result count, selected filter chips, full Tavernary facet controls, and state-aware project cards.

- [ ] **Step 1: Write failing default-filter test**

```tsx
expect(screen.getByRole("checkbox", { name: "SillyTavern" })).toBeChecked();
expect(screen.getByRole("checkbox", { name: "Extension" })).toBeChecked();
expect(screen.getByRole("checkbox", { name: "Preset" })).toBeChecked();
expect(screen.getByText("Showing SillyTavern extensions and presets. Clear filters to explore all Tavernary projects.")).toBeVisible();
```

Add tests that clearing SillyTavern shows other frontends, all CatalogCore facets appear, query text remains literal, selected chips remove one value, and sort labels match shared query options.

- [ ] **Step 2: Run focused tests and observe missing-route failures**

Run: `npm.cmd test -- tests/unit/projects-route.test.tsx tests/unit/project-card.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement controlled search and filter UI**

Dispatch every change to `DiscoveryController`; do not parse query syntax in components. Render the same filter content in the wide rail and compact/mobile sheet. Opening and closing the sheet preserves selections and returns focus to the filter trigger.

- [ ] **Step 4: Implement bounded project cards**

Render name, kind, two-line summary, frontend/category context, activity, TavernKeeper assessment/freshness, installed ownership, and exactly one primary action. Use the view model's reason text for browse-only cards. Do not infer safety from activity or popularity.

- [ ] **Step 5: Add performance guard**

Test the full fixture catalog renders its initial visible cards without eagerly mounting detail content. Introduce list virtualization only if Playwright measurement exceeds 150 ms scripting for a default-query update on the reference desktop; if introduced, preserve roving keyboard focus and scroll restoration tests.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- tests/unit/projects-route.test.tsx tests/unit/project-card.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- src/ui/projects src/ui/shared/assessment-badge.tsx src/ui/shared/activity-summary.tsx tests/unit/projects-route.test.tsx tests/unit/project-card.test.tsx
git commit -m "feat(ui): add catalog browsing"
```

### Task 3: Implement project details and Installed inventory

**Files:**
- Create: `src/ui/projects/project-detail.tsx`
- Create: `src/ui/projects/project-evidence.tsx`
- Create: `src/ui/installed/installed-route.tsx`
- Create: `src/ui/installed/installed-section.tsx`
- Test: `tests/unit/project-detail.test.tsx`
- Test: `tests/unit/installed-route.test.tsx`

**Interfaces:**
- Consumes: detail and installed view models plus `openExternal`, `openExtensionManager`, and state-aware action intents.
- Produces: complete evidence view and four-section installed inventory.

- [ ] **Step 1: Write failing detail and inventory tests**

```tsx
expect(screen.getByRole("heading", { name: "Alpha" })).toBeVisible();
expect(screen.getByText("TavernKeeper assessment")).toBeVisible();
expect(screen.getByRole("link", { name: /Open project source/ })).toHaveAttribute("target", "_blank");

expect(screen.getByRole("heading", { name: "Managed by Companion" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Installed outside Companion" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Not found in current catalog" })).toBeVisible();
```

- [ ] **Step 2: Run focused tests and observe missing-component failures**

Run: `npm.cmd test -- tests/unit/project-detail.test.tsx tests/unit/installed-route.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement project detail**

Render complete summary, kind/frontends/categories/tags/license, activity evidence, TavernKeeper current label and freshness, report link, attribution, fork relationship, source link, eligibility reason, installed ownership, Kit references, and state-aware action. Every external destination includes visible or accessible destination context.

- [ ] **Step 4: Implement Installed route**

Render section counts and empty explanations. Unknown installed extensions expose only `Manage in SillyTavern`; they never receive guessed Tavernary links. Entering the route triggers host rediscovery and shows an inline updating state without clearing the last inventory.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/unit/project-detail.test.tsx tests/unit/installed-route.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/ui/projects/project-detail.tsx src/ui/projects/project-evidence.tsx src/ui/installed tests/unit/project-detail.test.tsx tests/unit/installed-route.test.tsx
git commit -m "feat(ui): add project inventory views"
```

### Task 4: Implement freshness, loading, empty, and recovery surfaces

**Files:**
- Create: `src/ui/catalog/catalog-freshness.tsx`
- Create: `src/ui/catalog/catalog-state-panel.tsx`
- Create: `src/ui/catalog/catalog-change-notice.tsx`
- Modify: `src/ui/shell/shell-header.tsx`
- Test: `tests/unit/catalog-status-ui.test.tsx`

**Interfaces:**
- Consumes: `CatalogSnapshot`, refresh intent, native update handoff, and Open Tavernary intent.
- Produces: exact status copy and action availability for all catalog states.

- [ ] **Step 1: Write failing state-table tests**

Use table-driven cases for `Updated 2 hours ago`, `Checking for updates`, `Using saved catalog — offline`, `Saved catalog may be outdated`, `Companion update required`, initial skeleton, and no-cache error. Assert incompatible-with-cache exposes `Update Companion`, `Use cached catalog`, and `Open Tavernary`, with lifecycle action region disabled.

- [ ] **Step 2: Run focused test and observe missing-surface failure**

Run: `npm.cmd test -- tests/unit/catalog-status-ui.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement freshness and recovery UI**

Manual refresh preserves route/query/detail/scroll, shows progress beside freshness, and announces `Catalog is current` for 304. A changed selected project or Kit produces one quiet `Review changes` notice. Error detail is collapsed by default and excludes headers, credentials, or full payloads.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd test -- tests/unit/catalog-status-ui.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/ui/catalog src/ui/shell/shell-header.tsx tests/unit/catalog-status-ui.test.tsx
git commit -m "feat(ui): show catalog recovery states"
```

### Task 5: Implement the responsive visual system and accessibility gate

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/shell.css`
- Create: `src/styles/projects.css`
- Create: `src/styles/responsive.css`
- Modify: `src/styles/companion.css`
- Create: `tests/e2e/shell-responsive.spec.ts`
- Create: `tests/e2e/shell-accessibility.spec.ts`
- Create: `tests/fixtures/ui-harness.html`
- Test: `tests/unit/accessibility.test.tsx`

**Interfaces:**
- Consumes: semantic DOM from Tasks 1–4 and SillyTavern-compatible theme variables.
- Produces: the approved desktop/mobile geometry, focus behavior, motion behavior, and accessible interaction order.

- [ ] **Step 1: Write failing geometry tests**

```ts
test("1440x960 keeps the wide shell inside visible margins", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  const box = await page.getByTestId("companion-shell").boundingBox();
  expect(box).toMatchObject({ width: 1325, height: 864 });
  expect(box!.x).toBeGreaterThan(0);
  expect(box!.y).toBeGreaterThan(0);
});
```

Use a tolerance of 3 pixels for computed rounding. Add route/action visibility and zero-horizontal-overflow assertions at every required viewport.

- [ ] **Step 2: Run responsive tests and observe unstyled failures**

Run: `npm.cmd run test:e2e -- tests/e2e/shell-responsive.spec.ts`

Expected: FAIL because the geometry and breakpoint styles are absent.

- [ ] **Step 3: Implement theme and geometry tokens**

Define Companion-prefixed CSS custom properties mapped to SillyTavern surface/text variables with readable fallbacks. Implement beveled 4px accents, bounded cards, visible `:focus-visible`, 44px minimum compact touch targets, sticky header/search, internal workspace scrolling, and the four approved container modes.

- [ ] **Step 4: Implement motion and focus behavior**

Use short opacity/transform transitions only for sheets, detail, and notices. Under `prefers-reduced-motion: reduce`, set durations to 0.01ms and remove transforms. Make background content inert while the popup or nested modal owns focus.

- [ ] **Step 5: Run accessibility tests**

Run: `npm.cmd test -- tests/unit/accessibility.test.tsx`

Run: `npm.cmd run test:e2e -- tests/e2e/shell-accessibility.spec.ts`

Expected: no serious/critical axe violations, logical keyboard order, Escape closes only the top surface, and focus returns to its trigger.

- [ ] **Step 6: Run responsive tests**

Run: `npm.cmd run test:e2e -- tests/e2e/shell-responsive.spec.ts`

Expected: PASS at 1440x960, 1366x768, 1024x768, 800x600, 412x915, and 390x844, including 200% text and reduced motion.

- [ ] **Step 7: Commit**

```powershell
git add -- src/styles tests/e2e/shell-responsive.spec.ts tests/e2e/shell-accessibility.spec.ts tests/fixtures/ui-harness.html tests/unit/accessibility.test.tsx
git commit -m "feat(ui): add responsive visual system"
```

## Phase exit gate

Run:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- tests/e2e/shell-responsive.spec.ts tests/e2e/shell-accessibility.spec.ts
```

Capture computed shell geometry, horizontal-overflow measurements, axe results, keyboard traversal result, reduced-motion result, and screenshots for diagnostic evidence. Screenshots verify implemented behavior; they are not product mockups.
