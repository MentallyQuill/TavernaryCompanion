# Implementation Prompt: Tavernary Companion UI Parity Pass

You are working in `F:\git\TavernaryCompanion`. The authoritative Tavernary website repository is available locally at `F:\git\Tavernary`. This is an implementation task, not an audit-only task: inspect both repositories, establish a one-for-one comparison, implement the UI corrections in Tavernary Companion, and verify the result in deterministic local browser tests and, when available, the installed SillyTavern host.

The goal is not for Companion to be vaguely Tavernary-colored. Tavernary Companion must feel like Tavernary running as an actionable companion inside SillyTavern: the same design language, information hierarchy, density, icons, card anatomy, filters, scan presentation, interaction grammar, responsive behavior, and writing style wherever those concepts exist in both products. Companion-specific installation, inventory, Kit, trust, and host-management behavior must be expressed through Tavernary's visual system rather than through a second invented UI.

Do not stop after producing findings, a plan, screenshots, or a partial CSS pass. Carry the approved UI pass through source changes, focused tests, full verification, regenerated build artifacts, and a clear evidence-backed handoff. Preserve unrelated user changes and do not reset or overwrite a dirty checkout.

## Read this first

Before editing:

1. Read all applicable repository instructions, including `AGENTS.md` if present. Use GitHub CLI with network permission enabled whenever GitHub access is needed.
2. Inspect `git status --short` and recent history in both repositories. The Tavernary checkout may require a command-scoped safe-directory setting such as `git -c safe.directory=F:/git/Tavernary -C F:\git\Tavernary ...`; do not make an unnecessary global Git configuration change.
3. Treat current Tavernary source as visual and interaction authority. Existing Companion design documents and screenshot baselines are historical inputs, not proof that the current UI is aligned.
4. Inspect the current Companion snapshots before changing them. They visibly encode several problems named below, so never update snapshots merely to make a test green.
5. Make a compact source-to-target audit table for yourself before editing. For every relevant Tavernary component or selector, record the corresponding Companion component, whether it is exact, adapted for Companion behavior, missing, or incorrectly substituted. Continue directly into implementation after the audit.

## Authority order

When sources disagree, use this order:

1. The explicit interaction contract in this prompt.
2. Current `F:\git\Tavernary` components, CSS, icons, tests, and rendered reference snapshots.
3. Companion's existing installation, lifecycle, trust, inventory, Kit, self-protection, accessibility, and popup-containment behavior.
4. Existing Companion design documents and prior screenshot baselines.
5. SillyTavern host styling only where the native popup boundary requires it.

Do not let SillyTavern theme variables replace Tavernary's owned opaque canvas, typography, palette, or controls. Do not copy Next.js-specific implementation details blindly into Preact; port the DOM, behavior, tokens, and visual contract cleanly.

## Canonical Tavernary sources

Inspect these files in the website repository directly. Do not work from memory or from the existing Companion approximation.

### Global visual system

- `F:\git\Tavernary\src\app\globals.css`
- `F:\git\Tavernary\src\styles\tokens.css`
- `F:\git\Tavernary\src\styles\catalog.css`
- `F:\git\Tavernary\src\styles\responsive.css`
- `F:\git\Tavernary\src\styles\motion.css`

Use the exact semantic token meanings, not just selected hex values. Compare hover, focus, pressed, disabled, surface, border, text, kind, functional-action, activity, TavernKeeper, and license states. Preserve Tavernary's Inter Variable typography, 8px card radius, card shadow, compact control sizing, and hierarchy.

### Header, navigation, toolbar, and query presentation

- `src/features/catalog/components/site-header.tsx`
- `src/features/catalog/components/category-navigation.tsx`
- `src/features/catalog/components/catalog-toolbar.tsx`
- `src/features/catalog/components/active-query.tsx`
- `src/features/catalog/catalog-query.ts`, especially `CATEGORY_OPTIONS`
- `src/components/icons/category-icon.tsx`

The category/navigation bar must use Tavernary's real SVG icon family and responsive grammar. Port the complete icon vocabulary needed by the resulting Companion UI rather than keeping Companion's current partial icon component. Include the actual Tavernary marks for Kits, All Projects, Frontends, System Presets, the primary-function categories, search, filters, close, collapse, community, and Kit actions wherever their canonical controls are present.

Companion-specific routes such as Installed may be added to the Tavernary navigation grammar, but they must not cause the project categories to be replaced by generic text tabs. Do not invent a visual style for those additions. If an additive Companion shortcut has no direct upstream icon, derive it from the existing Tavernary icon system with matching stroke, view box, sizing, and state treatment; document the small product-specific deviation in the final handoff.

### Filters

- `src/features/catalog/components/filter-panel.tsx`
- `src/features/catalog/components/filter-controls.tsx`
- `src/features/catalog/components/filter-choice-chip.tsx`
- `src/features/catalog/components/tag-browser.tsx`
- `src/features/catalog/components/catalog-toolbar.tsx`
- the matching `.filter-*`, `.tag-browser-*`, `.catalog-toolbar`, `.filter-overlay`, and `.filter-sheet` rules in `src/styles/catalog.css` and `src/styles/responsive.css`

### Cards, activity, Kit control, and TavernKeeper

- `src/features/catalog/components/project-grid.tsx`
- `src/features/catalog/components/project-card.tsx`
- `src/features/catalog/components/project-kit-control.tsx`
- `src/features/catalog/components/activity-sparkline.tsx`
- `src/features/catalog/components/tavernkeeper-scan-indicator.tsx`
- `src/features/catalog/components/tavernkeeper-history-strip.tsx`
- `src/components/icons/tavernkeeper-scan-icon.tsx`
- `src/components/icons/tavernkeeper-freshness-clock-icon.tsx`
- the matching `.project-card*`, `.card-*`, `.activity-*`, `.project-kit-control*`, and `.tavernkeeper-*` rules in `src/styles/catalog.css` and `src/styles/responsive.css`

### Kits

- `src/features/kits/components/kit-builder.tsx`
- `src/features/kits/components/kit-builder-panel.tsx`
- `src/features/kits/components/kit-builder-row.tsx`
- `src/features/kits/components/project-selection-dock.tsx`
- `src/features/kits/components/kit-card.tsx`
- `src/features/kits/components/kit-filter-panel.tsx`
- associated Kit and project-selection rules in `src/styles/catalog.css` and `src/styles/responsive.css`

### Canonical visual and behavioral tests

- `tests/visual/catalog.visual.spec.ts`
- `tests/visual/catalog.visual.spec.ts-snapshots/`
- `tests/visual/reference-alignment.spec.ts`
- relevant unit tests for category navigation, filters, project cards, scan indicators, Kit selection, accessibility, and token contracts

Use Tavernary's committed screenshots as component references, but also render the current local Tavernary build at the same viewport as Companion when a source-level comparison leaves geometry ambiguous.

## Primary Companion targets

Expect to change the smallest coherent set of these files and their tests. Follow references if the true owner differs.

### Shell and navigation

- `src/ui/shell/shell-header.tsx`
- `src/ui/shell/route-tabs.tsx`
- `src/ui/shell/companion-shell.tsx`
- `src/styles/tokens.css`
- `src/styles/shell.css`
- `src/styles/responsive.css`

### Projects and filters

- `src/ui/projects/projects-route.tsx`
- `src/ui/projects/project-results-toolbar.tsx`
- `src/ui/projects/filter-panel.tsx`
- `src/ui/projects/active-filter-chips.tsx`
- `src/ui/projects/project-grid.tsx`
- `src/ui/projects/project-card.tsx`
- `src/ui/projects/project-detail.tsx`
- `src/ui/projects/project-evidence.tsx`
- `src/ui/shared/category-icon.tsx`
- `src/ui/shared/activity-summary.tsx`
- `src/ui/shared/activity-strip.tsx`
- `src/ui/shared/assessment-badge.tsx`
- `src/styles/projects.css`

### Kits, Installed, and lifecycle surfaces

- `src/ui/kits/kit-selection-dock.tsx`
- other components under `src/ui/kits/`
- components under `src/ui/installed/`
- components under `src/ui/lifecycle/`
- `src/styles/kits.css`
- `src/styles/lifecycle.css`

### Tests and generated output

- relevant tests under `tests/unit/`, `tests/integration/`, and `tests/e2e/`
- `tests/e2e/brand-alignment.spec.ts`
- `tests/e2e/responsive-conformance.spec.ts`
- `tests/e2e/responsive-conformance.spec.ts-snapshots/`
- `dist/companion.css` and `dist/extension.js`, regenerated only through the repository build

Do not hand-edit `dist` as the source of truth.

## Non-negotiable interaction contract

The following decisions are approved and must not be reopened or replaced with an invented alternative.

### Card/source behavior

- Clicking the project card's non-control area or its title opens that project's real canonical source/repository URL in a new tab.
- Implement this with a semantic anchor, preferably Tavernary's stretched primary-link pattern, not by turning the entire `<article>` into a button and not by attaching an unsafe blanket click handler.
- Use `target="_blank"` and `rel="noopener noreferrer"`.
- The link must be keyboard reachable, have a useful accessible name/description, and receive Tavernary's card-level hover/focus treatment.
- Interactive children—the TavernKeeper scan trigger, install action, Kit action, and any legitimate lifecycle control—must sit above the stretched link, remain independently operable, and never accidentally open the repository.

### Remove the oversized Details action

- Remove the large `Details` button from project cards.
- Do not replace it with another large secondary footer button.
- A normal card/source click opens the canonical repository.
- TavernKeeper evidence opens from the scan indicator, not from a generic project Details route.
- Existing project-detail entry points that only support the obsolete Details flow should be removed or rerouted. Remove dead UI code where safe.
- If a project-detail surface is still genuinely required by Installed or lifecycle behavior, redesign it as a compact, left-aligned Tavernary surface and prove why it remains. It must not be centered, dump raw definition-list content into a huge panel, repeat evidence already available in the scan popover, or become the default card destination.

### Install action

Use the user-supplied SVG at:

`C:\Users\Keptin\Downloads\install.svg`

The supplied icon has `viewBox="0 0 24 24"` and this meaningful path geometry:

```text
M9 2v2H5l-.001 10h14L19 4h-4V2h5a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5zm9.999 14h-14L5 20h14l-.001-4zM17 17v2h-2v-2h2zM13 2v5h3l-4 4-4-4h3V2h2z
```

Normalize it for the codebase:

- Remove the XML declaration, generator comment, fixed `800px` width/height, redundant group, and empty path.
- Preserve the meaningful path exactly.
- Render through a reusable Preact SVG component or equivalent code-native asset with `viewBox="0 0 24 24"`, `aria-hidden`, and `fill="currentColor"`.
- Do not fetch, redraw, or substitute another icon.

Place the install lifecycle control immediately to the left of the Kit `+` control in the bottom-right card action cluster. It is one stable toggle across the project's absent and installed states rather than two unrelated controls.

- For an absent, installable project, the supplied icon means `Install` and invokes the existing Companion install/trust/preflight lifecycle. It must not bypass policy or silently install on card click.
- Give it an accessible name such as `Install <project name>` and a concise Tavernary-style tooltip labeled `Install`.
- After Companion installs the project, keep the same control in the same position and give it an unmistakable installed/pressed state. The supplied glyph remains the face of this lifecycle toggle, while `aria-pressed`, color/border treatment, tooltip, and accessible name communicate the state change.
- In the installed state, clicking the control again means `Uninstall`: use an accessible name such as `Uninstall <project name>`, change the tooltip to `Uninstall`, and invoke the existing uninstall confirmation/impact flow. Never remove immediately or bypass confirmation merely because the control is compact.
- If the installed project is externally managed and Companion cannot safely own removal, keep the control state-specific and route it through the existing manage/ownership behavior instead of pretending the uninstall succeeded.
- Preserve disabled lifecycle locking and expose the reason accessibly.
- Do not show this lifecycle toggle for presets, unsupported frontends, browse-only projects, missing install contracts, or the Companion itself.
- Do not use the lifecycle toggle to mean Update Companion, View Project, Kit selection, or an unrelated generic selected state.
- Preserve those other states with compact, explicit state-appropriate controls or status treatment.
- Match Tavernary's visible compact action face while retaining a minimum 44×44 hit target on coarse pointers.

### Kit `+` behavior and label

- Remove the global `Select for Kit` mode button from the result toolbar.
- Tavernary's per-card orange `+` is the Kit selection affordance.
- The `+` control remains to the immediate right of the install control.
- Render the word `Kit` directly below the visible plus face in small, readable text so the control cannot be confused with installation. Treat the face and label as one semantic button/hit target.
- Use Tavernary's functional orange action treatment, focus ring, pressed state, and large invisible/coarse-pointer hit area.
- When no Kit selection is active, pressing `+` begins Kit selection and immediately selects that project. Do not require a prior global mode switch.
- When selection is active, pressing the control toggles that project. Use Tavernary's selected/in-Kit visual state and plus/minus glyph semantics as appropriate, while keeping the small `Kit` label visible.
- The accessible label must say `Add <project> to Kit`, `Remove <project> from selection`, or `Remove <project> from Kit` according to state.
- Keep the existing review/cancel selection workflow, count, Kit validation, and creation behavior, but restyle the selection dock/builder from the real Tavernary project-selection and Kit-builder sources.
- The install and Kit controls must be visually distinct and independently clickable even though they are adjacent.

## Shell and navigation requirements

The current Companion header and route tabs are only superficially branded. Rebuild them from Tavernary's real composition.

- Keep the production trihex, `Tavernary` wordmark, `Where AI roleplay tools gather` tagline, and a subordinate `Companion` qualifier.
- Use Tavernary's exact header surface, border, grid/flex behavior, spacing, typography, search icon, input height, placeholder, focus treatment, and responsive reorder.
- Search remains a first-class header control on the Projects route. It must not look like a detached generic form input.
- Replace plain `Projects / Kits / Installed` text tabs and the generic mobile `<select>` presentation with Tavernary's category-navigation grammar and real icons. Adapt route/category data without losing Companion's Projects, Kits, and Installed destinations.
- Project category controls must drive the existing query category/kind state rather than being decorative.
- Ensure System Presets and extension/project-function browsing expose the appropriate Tavernary SVG identity instead of generic text-only controls. Follow current upstream `CATEGORY_OPTIONS` and `CategoryIcon` semantics; where Companion adds a kind shortcut, make the additive mapping explicit and visually native.
- On mobile, use Tavernary's Browse trigger/menu pattern with icon, eyebrow, current label, chevron, selected states, dismissal, and focus behavior. Do not fall back to the current browser-native route select.
- Keep catalog freshness/refresh once. Do not create a second status row.
- Preserve the host Close control only when it exists, but make it a compact Tavernary-style utility rather than a dominant generic button.

## Filter requirements

The filter rail must reproduce Tavernary's structure and behavior, not merely place all query fields in a sidebar.

- Remove the redundant Category `<select>` from the filter panel. Category browsing belongs in the navigation bar.
- Use a flush desktop rail matching Tavernary's sidebar width, surface, right divider, padding, heading, uppercase legends, type scale, and spacing.
- Use the canonical group names and order where data is available:
  1. `Compatible frontend`
  2. `Project kind`
  3. `Goals & traits`
  4. `Model family`
  5. `Completion format`
  6. `Development`
  7. `License`
- Do not render every option as a bubble or chip. Tavernary uses compact list checkboxes/radios for frontends, project kind, development, and license; chips are reserved for the metadata/tag treatments that actually use them upstream.
- Show authoritative option counts and update them from catalog data. Do not hardcode fixture counts or labels.
- Order frontend options using the same upstream popularity logic when the data contract supports it. Keep selected options visible when collapsed.
- Implement frontend search, initial preview limits, `Show more`/`Show fewer`, selected-first chip ordering, four-row chip bounds, and the upstream empty/search states.
- Implement the Goals & traits tag browser from the catalog's real `tagVocabulary`, including facet grouping, counts, search, preview disclosure, selection, and selected filters. Do not collapse all tags into an undifferentiated raw checkbox dump.
- Source model-family and completion-format labels from authoritative catalog/vocabulary data rather than a divergent hand-written list.
- Match Tavernary's checkboxes, selected colors, counts, disabled states, hover, focus-visible, and disclosure controls exactly where possible.
- Active query chips must cover every active query dimension, not only frontends and kinds. Each chip removes exactly its represented filter, and `Clear all` preserves search/sort only if that is the established Companion contract.
- Preserve existing filter/query logic and the shared core's boolean semantics. UI parity must not silently change how filters combine.

### Compact/mobile filter sheet

- At the responsive breakpoint appropriate to the actual Companion container—not blindly the browser viewport—the desktop rail disappears and an icon-sized Tavernary filter trigger appears.
- Use the exact filter-lines SVG, selected-count badge, surface, radius, and 44×44 coarse-pointer target grammar from Tavernary.
- The filter sheet is constrained to the Companion overlay/popup, not the whole page when those coordinate systems differ.
- Give it Tavernary's `Refine catalog` eyebrow, `Filters` heading, close icon, inset geometry, raised surface, sticky header, and independent vertical scroll.
- Preserve Escape dismissal, backdrop dismissal, focus trap, focus restoration, inert background, and removal from the accessibility tree when closed.
- Clear filters and the relevant result/action controls must remain reachable at short mobile heights and 200% text.

## Project card requirements

Port Tavernary's card DOM and scan order rather than styling the current footer-heavy structure around the edges.

The visual/content order is:

1. Kind/primary-function icon plus colored uppercase kind label.
2. Compact activity evidence: neutral `Activity` label, twelve-week strip, recency, community count, and repository size where authoritative data exists.
3. Project title as the canonical source link and the interactive TavernKeeper scan indicator.
4. Attribution and concise catalog-state notes where present.
5. Left-aligned bounded summary.
6. Search evidence only when a search result genuinely needs it.
7. Frontend, goal/trait, model-family, and completion-format chips using Tavernary's exact type-specific treatments.
8. License/ownership context and the compact action cluster: install control on the left, Kit control on the right.

Specific rules:

- Match Tavernary's card minimum size, padding, border, radius, surface, shadow, divider, line heights, grid gap, and hover/focus elevation.
- Do not center card text or metadata.
- Do not create a giant footer or equal-width action row.
- Preserve extension, frontend, and preset kind colors exactly. TavernKeeper risk colors are evidence semantics and may not be repurposed as generic success decoration.
- Keep activity bars neutral as upstream currently does; do not restore unexplained `N/12` visible labels if current Tavernary says `Activity`.
- Clamp summaries and chip regions in the same responsive way as Tavernary without hiding critical interaction or accessibility text.
- Keep project names, attribution, summaries, state notes, metadata, and action reasons in the same writing style and capitalization as upstream. `System Preset`, `Recent Activity`, `Recently released`, and `Pending verification` should not drift into inconsistent local labels.
- Do not display internal raw enum values such as `preset`, `metadataStatus`, `sourceStatus`, or ownership codes directly to users.

## TavernKeeper assessment requirements

Replace Companion's static assessment badge plus oversized project-detail evidence dump with the real Tavernary scan-indicator interaction.

- Port/adapt `tavernkeeper-scan-indicator.tsx`, its scan and freshness-clock icons, history strip, accessible status language, and relevant CSS.
- The scan indicator sits beside the project title and opens a compact anchored popover/dialog.
- Match Tavernary's risk/freshness states, status headings, headline/summary hierarchy, finding counts, scan details, scanned-source link, recent history, full report link, unsupported/unassessed states, and terminology.
- Use only fields that exist authoritatively in Companion's catalog data. Omit unavailable values instead of inventing them.
- The popover is left-aligned and compact. It must not turn into a full centered page, raw `<dl>` dump, or duplicate all project metadata.
- It must stay within the Companion viewport at desktop, compact desktop, landscape, and narrow phone sizes; long headlines and summaries must wrap or ellipsize according to the upstream tested behavior.
- Support click/tap, keyboard activation, Escape, outside-click dismissal, focus restoration, correct `aria-expanded`/`aria-controls`, and reduced motion.
- Links to the full TavernKeeper report and scanned source open safely in new tabs.

## Results toolbar and content density

- Rebuild the results row from Tavernary's `CatalogToolbar` instead of keeping Companion's loose `437 projects / Recently active / Select for Kit` strip.
- Use the upstream result heading, sort control labels, density control if retained, safety disclosure placement, filter trigger, and refreshed text treatment.
- Remove `Select for Kit`; per-card `+ Kit` replaces it.
- Avoid redundant `Projects` headings or explanatory paragraphs when navigation and result context already communicate the route.
- Keep the TavernKeeper safety disclosure concise and styled like the upstream linked advisory rather than as a large block that pushes cards down.
- Preserve bounded/incremental card rendering and authoritative total counts.
- At the deterministic 390×844 fixture, the first card must begin no lower than the approved 400px ceiling, and should move closer to current Tavernary density if all controls remain usable.

## Kits, Installed, dialogs, and trays

This pass is not complete if Projects looks native while the rest of Companion still looks unrelated.

- Apply Tavernary's card, row, chip, control, surface, typography, spacing, and navigation grammar to Kits and Installed wherever the same concepts exist.
- Use Tavernary's real Kit builder, project-selection dock, member row, action hierarchy, and mobile adaptation as the visual reference while retaining Companion's local persistence and lifecycle behavior.
- Installed entries must expose canonical source access and clear management/uninstall state without routing users through the obsolete messy project Details screen.
- Preserve Companion self-protection: Tavernary Companion itself is managed in SillyTavern and cannot uninstall itself through its own lifecycle.
- Restyle trust disclosures, warning dialogs, preflight, operation trays, receipts, empty states, and errors so they belong to the same product. Do not remove or weaken safety gates to make the UI simpler.
- Keep destructive actions explicit and state-appropriate. Do not use the install SVG for them.

## Responsive and host-containment contract

Test responsive behavior against the Companion container and native SillyTavern popup, not only a full-page browser fixture.

- Desktop reference: 1440×960.
- Compact desktop/tablet reference: 1024×768.
- Mobile references: 390×844 and 412×915.
- Also inspect a narrow 320–360px width, short mobile height, coarse pointer, reduced motion, and 200% text.
- Desktop should show a persistent Tavernary filter rail and a card grid with Tavernary-like density; target three columns at 1440 when the popup provides enough inner width and two at 1024 when card minimum width requires it.
- Mobile uses one card column, a Tavernary Browse menu, and a contained filter sheet.
- The shell width is constrained by the popup content box. Never add `100vw` on top of the popup's own inset.
- Maintain one clear vertical scroll owner per route and separate scrolling only for active modal/sheet surfaces.
- Prove `scrollWidth === clientWidth` for document, Companion root, active route, cards, sheets, and relevant transient surfaces.
- No header item, icon, action cluster, Kit label, popover, sheet, dialog, or text content may clip or overlap.
- Keep all coarse-pointer targets at least 44×44px even when the visible face is smaller.
- Reduced motion removes nonessential transforms/transitions without breaking final state.

## Accessibility contract

- Preserve semantic anchors for external source navigation and semantic buttons for actions.
- Icon-only controls require accessible names and Tavernary-style tooltips where useful.
- Visible focus indicators must use the actual Tavernary focus token.
- Keyboard order must follow visible order: navigation/search, results controls, filters, cards, card-local scan/install/Kit actions.
- Escape closes the topmost transient surface only.
- Focus returns to the invoking control after closing Browse, filters, TavernKeeper popovers, dialogs, or retained details.
- Selected/pressed state uses `aria-pressed` where appropriate; disclosure state uses `aria-expanded` and `aria-controls`.
- Status/count announcements should be useful but not noisy.
- Run automated accessibility coverage and manually inspect keyboard focus, long text, and 200% zoom.

## Testing requirements

Use test-driven changes for behavior. At minimum, add or update focused tests that fail against the current implementation and prove:

1. The project title/stretched card link opens `canonicalUrl` in a new tab with safe rel attributes.
2. Clicking scan, install, or Kit controls does not activate the repository link.
3. No `Details` button is rendered on project cards.
4. The supplied install glyph renders as one stable lifecycle toggle: the absent state invokes the existing install flow, while the installed/pressed state is labeled `Uninstall` and invokes the existing uninstall confirmation flow.
5. Browse-only, preset, current-extension, and update-required states do not misuse the lifecycle toggle; externally managed installed projects preserve their ownership/management restrictions.
6. The Kit control is always available for selectable projects, starts selection on first press, toggles state thereafter, and visibly renders `Kit` beneath the face.
7. The global `Select for Kit` button is absent.
8. TavernKeeper scan state opens the correct popover content and supports keyboard, Escape, outside click, and focus restoration.
9. Header/category navigation renders the expected SVG icons and changes the correct route/query state.
10. Filters use correct labels, data-derived counts, group-specific list/chip treatments, search/collapse behavior, tag facets, active-query removal, and clear behavior.
11. Mobile Browse and filter surfaces open, trap focus, close, restore focus, and remain within the Companion root.
12. Existing install trust gates, lifecycle locks, self-protection, Kit creation/review, inventory state, and browser Back behavior still work.

Update visual tests only after comparing the new render against Tavernary source and reference renders. Add geometry assertions for:

- header, search, and navigation alignment;
- desktop filter-rail width and flush edge;
- result toolbar density;
- card grid columns and gaps;
- first-card top position on mobile;
- card padding/radius/surface/shadow;
- title, scan indicator, activity row, summary, chips, license, install icon, and `+ Kit` action placement;
- filter-sheet containment;
- TavernKeeper popover containment at all target viewports;
- zero horizontal overflow.

Committed Companion screenshots should cover Projects at 390×844, 412×915, 1024×768, and 1440×960, plus mobile filters, a TavernKeeper popover, active Kit selection with the `+ Kit` treatment, Kits, Installed, and at least one lifecycle/trust surface. Do not use a huge pixel tolerance to bless structural drift.

## Verification sequence

Use Windows commands (`npm.cmd`) in these repositories.

Run focused tests while iterating, then finish with fresh evidence:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run release:package
npm.cmd run release:verify
```

If the package scripts make `npm.cmd run check` the canonical aggregate gate, run it as well. Do not claim a full pass from focused tests alone.

For visual reference, build Tavernary's catalog before running its local visual target when necessary:

```powershell
npm.cmd run catalog:build
npm.cmd run test:visual
```

Run those commands from `F:\git\Tavernary` only when needed for current reference proof; do not modify Tavernary merely to make Companion tests pass.

When an installed SillyTavern host is available, package/install the exact current Companion artifact using the repository's established safe workflow and verify the actual popup at desktop and mobile emulation. Report source tests, packaged-artifact proof, installed-host proof, and any GitHub/deployment state separately. Never present a fixture screenshot as installed-host proof.

## Definition of done

The work is complete only when all of the following are true:

- Side-by-side renders immediately read as the same Tavernary product family through structure and interaction, not merely palette.
- Header/search/navigation use Tavernary's real composition and SVG vocabulary.
- The desktop filter rail and compact filter sheet reproduce Tavernary's functional grouping, counts, search, disclosure, and control treatments; the raw checkbox wall and redundant Category dropdown are gone.
- Project cards open the canonical source from the card/title, contain no large Details button, and maintain correct nested-control behavior.
- The supplied install icon appears immediately left of the Kit control as one stable install/uninstall lifecycle toggle: absent installs safely, installed is visibly pressed and uninstalls through the existing confirmation flow.
- The Kit control visibly shows `Kit` beneath its plus/minus face, begins selection on first press, and replaces the global Select for Kit mode switch.
- TavernKeeper assessment is a compact, usable scan popover matching Tavernary instead of a centered, poorly formatted detail dump.
- Cards, Kits, Installed, dialogs, trays, empty states, and lifecycle surfaces share the same typography, surfaces, spacing, controls, and responsive grammar where applicable.
- All target viewports, keyboard use, coarse pointer, reduced motion, 200% text, focus restoration, and zero-overflow checks pass.
- Focused tests, the full repository gate, full Playwright suite, build, packaging, and release verification pass with fresh output.
- Generated artifacts and screenshot baselines correspond exactly to the verified source.
- The final handoff lists changed source files, behavior changes, exact verification commands/results, remaining deviations from Tavernary with reasons, and whether installed-host verification was actually performed.

Do not declare completion while any major surface is merely color-matched, while the current oversized Details flow remains the normal project path, while install and Kit semantics are ambiguous, or while updated snapshots are the only evidence of correctness.
