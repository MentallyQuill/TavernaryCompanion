# Tavernary Responsive Conformance Design

## Goal

Rebuild Tavernary Companion's responsive presentation so the mobile interface follows Tavernary.org's current information hierarchy, density, scan order, and interaction grammar, while desktop reads as the same product family inside SillyTavern's overlay boundary.

The Companion retains its own Projects, Kits, Installed, lifecycle, trust, and host-management behavior. Tavernary.org is authoritative for layout and component presentation; Companion-specific operations are mapped into that grammar instead of adding a separate visual system.

## Visual authority

1. Tavernary.org mobile composition at `390x844` and `412x915`.
2. Tavernary.org desktop composition at `1440x960` and its compact adaptation at `1024x768`.
3. Companion's existing lifecycle, Kit, inventory, accessibility, and popup-containment requirements.
4. SillyTavern's popup lifecycle and safe-area constraints.

Reference captures are observational inputs, not brittle automated dependencies. Deterministic Companion fixtures own committed screenshot baselines; fresh Tavernary.org captures are used during visual review.

## Architecture

Use one semantic component tree with responsive composition controlled by CSS. Do not fork independent mobile and desktop applications. Component markup may expose small presentation seams, such as a compact route selector and desktop category navigation, when a single control cannot satisfy both interaction patterns accessibly.

The shell remains a parent-constrained Companion overlay. Desktop keeps visible SillyTavern context around the overlay. Mobile fills the popup content box and behaves as an application surface with one vertical scroll owner.

## Shared shell

### Header

The header adopts Tavernary's production order:

1. Tavernary trihex, name, and tagline.
2. Primary catalog search.
3. Compact utilities.
4. Route navigation.

On desktop, these form a compact top bar followed by a category-style navigation row. Projects, Kits, and Installed occupy the left side of that navigation grammar. Catalog freshness and refresh are compact utilities; they do not create a separate status row.

On mobile, the brand and compact utilities occupy the first row, search occupies the second row, and a single Tavernary-style Browse selector occupies the third row. The selector contains Projects, Kits, and Installed and replaces the persistent three-tab strip. Refresh uses a compact icon-sized control with an accessible name. The tagline may remain visible when it fits without displacing search or navigation.

### Scroll ownership

The shell header remains stable. Each active route owns one vertical content scroller. Filter sheets and dialogs own scrolling only while open. No page, route, card, or nested container creates horizontal overflow at the target viewports or 200% text size.

## Projects route

### Mobile composition

The mobile order mirrors Tavernary.org:

1. Brand and utilities.
2. Search.
3. Browse selector.
4. Advisory or route context when present.
5. One dense results row containing result count, sort, active-query clear, and filter trigger.
6. Compact active-filter chips only when filters differ from the default scope.
7. Single-column result cards.

Remove the redundant `Projects` page title and default-scope explanatory paragraph on mobile. Their meaning is already conveyed by the Browse selector and active filters. `Select for Kit` becomes a compact action within the results row or its immediate action group.

The first project card should begin no lower than `400px` from the top at `390x844` with the deterministic fixture and default filters. Tavernary.org currently begins its first card near `328px`; the additional allowance covers Companion's route and Kit-selection requirements without accepting the current approximately `613px` start.

### Desktop composition

Desktop uses a unified Tavernary-shaped shell:

- A persistent left filter rail on wide layouts.
- A compact result header containing advisory text, result count, clear control, sort, and Kit-selection action.
- Three project columns at `1440x960` when the detail view is closed.
- Two columns at `1024x768` when card minimum width would otherwise be violated.
- No duplicate route title, default-scope paragraph, or detached search toolbar.

Search remains in the shared header. Filters and results start directly beneath navigation, matching Tavernary's density.

## Project cards

Project cards preserve Tavernary's production scan order:

1. Kind icon and label.
2. Activity label, twelve-week evidence, recency, community score, and repository size when available.
3. Project name and assessment indicator.
4. Attribution.
5. Summary.
6. Frontend and goal/trait chips.
7. License or ownership context.
8. Compact primary lifecycle action.

Companion's `Details` action remains available without creating a large two-button footer. The card itself exposes details through a clearly labeled compact secondary action or an accessible card-detail target. Install, uninstall, update, manage, and Kit-selection actions retain their current domain semantics.

Cards use Tavernary's padding, line height, dividers, chip density, and orange square primary action grammar. Mobile cards are not reduced to unreadable micro-layouts: interactive targets remain at least `44x44px`, while visible button chrome may be smaller through padding on a larger hit target.

## Filters

Wide desktop retains a persistent Tavernary sidebar with searchable/collapsible groups, counts, selected-first ordering, and a clear action.

At compact desktop and mobile widths, filters open as a fixed sheet constrained to the Companion overlay. The sheet includes:

- A sticky heading and Close control.
- Its own vertical scrolling region.
- Clear filters and result count actions that remain reachable.
- Escape dismissal, focus trapping, and focus restoration.
- Backdrop dismissal when it cannot conflict with a destructive or in-progress operation.

The closed sheet is removed from layout and the accessibility tree.

## Kits and Installed

Kits and Installed reuse the shared header, Browse selector, result header, cards, rows, sheets, and spacing tokens. They do not retain separate oversized route headings or disconnected filter controls.

Published and personal Kit switching remains available through a compact segmented control below the shared Browse selector. Installed sections use dense Tavernary rows with clear counts and lifecycle actions. Detail, editor, preflight, warning, operation, and receipt surfaces retain their behavior and adopt the same responsive spacing and action hierarchy.

## Accessibility and behavior

- Route controls preserve tab or selector semantics appropriate to their rendered form.
- Search has one programmatic label and remains reachable before result controls.
- All icon-only controls have accessible names and visible focus indicators.
- Touch targets are at least `44x44px` on coarse pointers.
- Focus returns to the invoking control after closing filters, details, dialogs, or operation surfaces.
- Reduced-motion mode removes nonessential transitions.
- Browser/mobile Back closes the topmost transient surface or returns from detail before closing Companion.
- Existing trust prompts, self-protection, lifecycle locks, inventory reconciliation, and Kit receipts remain unchanged.

## Playwright conformance loop

Use a deterministic local fixture and iterate in this order:

1. Capture fresh Tavernary.org reference viewports at `390x844`, `412x915`, `1024x768`, and `1440x960`.
2. Capture the matching Companion fixture states for Projects, filters open, Kits, Installed, detail, and lifecycle surfaces.
3. Compare hierarchy, occupied vertical space, control grouping, card density, and responsive transitions.
4. Adjust the smallest shared component or responsive rule that closes the observed gap.
5. Rerun focused geometry, interaction, accessibility, and screenshot assertions.

Committed tests must verify:

- Stable screenshot baselines for deterministic Companion states.
- Header, search, navigation, results controls, filter rail or sheet, and first-card bounding boxes.
- First-card start at or above `400px` on `390x844` default Projects.
- Desktop filter rail and three-column geometry at `1440x960`.
- Two-column compact desktop geometry at `1024x768`.
- One-column mobile cards at `390x844` and `412x915`.
- No document, shell, route, or card horizontal overflow.
- Search, Browse selector, filters, sorting, route changes, details, and primary actions remain operable.
- Keyboard focus order, Escape dismissal, focus restoration, touch targets, reduced motion, and 200% text behavior.
- No console errors, page errors, or failed catalog requests.

Pixel comparisons against live Tavernary.org are not committed because catalog content and freshness change. Fresh reference captures and deterministic local baselines together provide visual authority without flaky remote tests.

## Verification and release

Run focused unit and Playwright suites after each structural pass. Completion requires the full repository gate, the full Playwright suite, release packaging verification, installed SillyTavern browser proof when the local host is available, a reviewed staged diff, and a safe integration with current remote `main`.

The final push must preserve unrelated staged or working-tree changes. If remote `main` advanced, integrate through a current-main worktree or scoped commits; never reset or force-push the active checkout.
