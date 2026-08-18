# Responsive Shell and Visual System

## Goal

The shell must hold Tavernary's information density without becoming a full-screen desktop website. It should feel like a substantial tool opened inside SillyTavern: larger than Directive on desktop, purpose-built for touch on mobile, and stable under browser zoom, reduced motion, and on-screen keyboards.

## Visual character

The interface combines three influences:

- **Directive:** decisive overlay framing, beveled surfaces, compact route controls, strong hierarchy, and responsive drawers.
- **Tavernary:** neutral project cards, evidence-forward metadata, restrained status colors, and readable catalog typography.
- **SillyTavern:** theme-aware text and surface tokens, native popup expectations, and familiar close/back behavior.

It does not reproduce Directive's LCARS campaign shell or Tavernary's full website columns. Decorative chrome remains subordinate to project names, search, filters, Kit state, and lifecycle actions.

## Shell anatomy

From top to bottom:

1. **Frame:** backdrop, beveled outer edge, and visible separation from SillyTavern.
2. **Header:** product name, route tabs, catalog freshness, refresh, Open Tavernary, Back, and Close.
3. **Search row:** persistent search field, result count, sort control, and filter trigger or rail relationship.
4. **Context row:** active-filter chips, route-specific state, and compact notices.
5. **Workspace:** filter rail or sheet, card results, detail drawer, Kit editor, or installed inventory.
6. **Operation layer:** transient confirmation dialogs, progress tray, and durable result receipt.

Header and search remain visible while the workspace scrolls. The shell itself does not page-scroll behind the popup.

## Desktop geometry

The starting shell dimensions are:

- Width: `min(92vw, 1440px)`
- Height: `min(90dvh, 960px)`
- Centered with SillyTavern still visible around the backdrop edge

Expected examples:

| Browser viewport | Approximate shell | Default layout |
|---|---:|---|
| 1440x960 | 1325x864 | Filter rail and three card columns |
| 1366x768 | 1257x691 | Filter rail and three compact columns |
| 1024x768 | 942x691 | Collapsible filters and two columns |
| 800x600 | 736x540 | Compact sheet and one column |

These values are responsive starting points, not fixed device assumptions. Browser tests may adjust exact thresholds when real geometry exposes clipping or unusably narrow cards.

## Container modes

### Wide: above 1200px

- Persistent filter rail.
- Three project columns when no detail is open.
- Two result columns plus a detail drawer when a project is selected.
- Header actions remain labeled where space allows.

### Standard: 900–1199px

- Filter rail collapses into a labeled control.
- Two project columns.
- Detail drawer overlays part of the workspace rather than squeezing cards below their minimum width.
- Secondary header actions may become icon-plus-tooltip controls.

### Compact tablet: 720–899px

- One primary results column.
- Filters open as an anchored sheet.
- Project details use a nested view.
- Header separates primary navigation from utility actions if one row cannot remain readable.

### Mobile: below 720px

- The popup becomes a full-width, full-height sheet using dynamic viewport units and safe-area padding.
- Projects, Kits, and Installed remain reachable without horizontal scrolling.
- Search is sticky; filters and sort open touch-friendly sheets.
- Cards become a single column with the primary action reachable without opening details.
- Nested views use explicit Back and browser/mobile Back integration.

## Card rhythm and density

Cards use a consistent vertical rhythm so users can scan names, summaries, assessment states, and actions in the same order. Descriptions are line-clamped in results but complete in details. Tags and metadata wrap within a bounded region rather than increasing every card to the tallest result.

Primary actions occupy a stable lower action row. Status badges do not move the action. A card may grow for translated or enlarged text, but neighboring cards need not share a forced height if doing so creates large empty regions.

## Color and surfaces

Base surfaces inherit SillyTavern theme variables through a Companion token layer. Companion defines semantic tokens for frame, raised surface, inset surface, text, muted text, border, focus, primary action, destructive action, and assessment states.

TavernKeeper colors retain their meaning:

- Teal: Low concern
- Orange: Material concern
- Red: Immediate danger
- Gray: unavailable or unassessed

Those colors are never reused for popularity, quality, installation success, or route identity. Every colored state also has text and an accessible name.

## Typography and icons

The typography prioritizes high-density readability over stylistic novelty. Project names, dialog headings, and active route labels carry the strongest weight. Body text uses comfortable line height. Metadata is smaller but never below the accessible minimum established during browser testing.

Icons supplement labels; they do not replace unfamiliar actions. Icon-only controls require tooltips and accessible names. External-link treatment is consistent across Tavernary, source, scan, and assessment-history destinations.

## Motion

Motion communicates spatial relationships:

- Detail drawers enter from the side that owns them.
- Mobile nested views move along the Back direction.
- Filter sheets emerge from their trigger context.
- Operation progress changes state without celebratory animation.

Transitions are short and interruptible. Reduced-motion mode removes sliding and scaling, replacing them with immediate state changes or minimal opacity transitions. No essential status relies on motion completing.

## Focus, scroll, and interruption

Opening the shell stores the opener. Closing restores focus there when it still exists. Opening a detail stores the originating card and result scroll; Back restores both. Filter sheets and dialogs trap focus only while open. Background SillyTavern content is inert to pointer and keyboard interaction.

When the on-screen keyboard changes mobile viewport height, header and active form controls remain visible. Scroll containers avoid nested vertical scrolling wherever possible. Long dialogs keep headings and final actions reachable without losing context.

## Approach

The shell uses a native SillyTavern popup as the lifecycle boundary and a single responsive Companion layout within it. Container-aware CSS controls information density; JavaScript tracks only behavior CSS cannot express, such as route history, focus restoration, and measured drawer placement.

Visual tokens isolate Companion from host-theme churn. Geometry tests inspect rendered bounding boxes at every target viewport rather than assuming CSS declarations prove usability.

## UI acceptance

- 1440x960 comfortably shows the wide workspace with visible outer margin.
- 1024x768 reorganizes before cards or header controls overlap.
- 800x600 remains fully operable with internal scrolling and no clipped actions.
- 390px and 412px mobile views expose every route and primary action without horizontal page scroll.
- Browser zoom and text enlargement do not hide Close, Back, warnings, or lifecycle actions.
- Reduced-motion, keyboard-only, and screen-reader use preserve the same information and operation order.
