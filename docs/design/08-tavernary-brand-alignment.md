# Tavernary Brand Alignment

## Goal

Tavernary Companion is Tavernary running as an actionable SillyTavern companion, not a third-party interface that merely reads Tavernary data. A user moving between `tavernary.org` and Companion should recognize the same brand and web software before reading the product name.

Directive contributes the containment model: a decisive overlay, internal scrolling, responsive sheets, focus restoration, and compact host-aware controls. It does not supply Companion's palette, typography, card language, control styling, or information hierarchy. SillyTavern supplies the popup lifecycle and extension APIs, not the product theme.

## Visual authority

When visual sources disagree, use this order:

1. Tavernary's production logo, design tokens, typography, controls, cards, filters, and evidence language.
2. Companion's install, Kit, inventory, trust, and host-management requirements.
3. Directive's overlay geometry and responsive interaction patterns.
4. SillyTavern's native popup boundary.

Host theme variables may not replace Tavernary's identity. Companion remains legible against SillyTavern themes by owning an opaque Tavernary canvas and overlay surface.

## Exact brand foundation

Companion carries Tavernary's production trihex mark and the lockup:

- **Tavernary**
- **Where AI roleplay tools gather**
- A small **Companion** product qualifier that does not replace or visually dominate the Tavernary name.

Companion uses Tavernary's Inter Variable typography and production color system. The foundational values are:

| Role | Value |
|---|---|
| Canvas | `#0D1117` |
| Header | `#101820` |
| Sidebar | `#121A1F` |
| Surface | `#182228` |
| Raised surface | `#1C282E` |
| Input | `#10191E` |
| Default border | `#2B3A40` |
| Primary text | `#E6EDF3` |
| Secondary text | `#A8B3BA` |
| Muted text | `#829099` |
| Tavernary teal | `#2DD4BF` |
| Functional orange | `#E18A24` |
| Frontend red | `#D62839` |
| Preset green | `#57C5A3` |

The complete semantic token set is copied from Tavernary, retaining its hover, pressed, focus, safety, and disabled variants. Project-kind colors retain Tavernary's meanings. TavernKeeper teal, orange, red, and gray remain evidence states and are not reused as generic success decoration.

## Shell mapping

The overlay header uses Tavernary's production header treatment: trihex brand lockup on the left, a compact product qualifier, and catalog freshness plus external/open controls on the right. The Projects, Kits, and Installed routes use Tavernary's category-navigation visual grammar, with teal active surfaces and consistent icons.

Search, sort, result count, active query, and filters form one Tavernary-shaped discovery toolbar. Catalog freshness appears once. Companion does not show duplicate refresh rows.

The shell is constrained by both viewport and native popup content:

- Desktop target remains `min(92vw, 1440px)` only when the popup can provide that width.
- Actual width is `min(100% of popup content, 92vw, 1440px)`.
- The shell must satisfy `left >= 0`, `right <= viewport width`, and `scrollWidth == clientWidth` in the installed host.
- On mobile, it fills the popup content box rather than adding `100vw` to the popup's own inset.

Directive-style beveling is limited to the outer overlay edge and transient drawers. Tavernary's 8px rounded cards, conventional controls, and surface shadows remain intact.

## Projects

Project cards reuse Tavernary's scan order and anatomy:

1. Kind icon and colored uppercase kind label.
2. Compact source-activity evidence.
3. Project name and TavernKeeper indicator.
4. Attribution when available.
5. Bounded summary.
6. Frontend/category/tag chips.
7. License or ownership context.
8. Companion's Details and lifecycle action row.

Install, Uninstall, and Kit actions use Tavernary's functional-orange primary action treatment. Details and browse-only actions use Tavernary secondary controls. Cards never fall back to SillyTavern's global button styling.

The filter rail uses Tavernary's sidebar surface, uppercase group labels, searchable/collapsible metadata chips, counts where available, and selected-first ordering. On compact layouts it becomes a fixed sheet with its own scrolling and sticky close/clear controls.

## Kits and Installed

Published and personal Kit cards use the same Tavernary surface, border, typography, chip, and control system as project cards. Kit origin and operational state replace project kind and activity without inventing a separate visual brand.

Installed inventory uses Tavernary compact sections and rows. Empty sections collapse to counts or concise empty text. Tavernary Companion itself is labeled **Companion · managed in SillyTavern** and never appears as an unknown catalog warning.

## Performance and route mounting

Only the active primary route is mounted. Project results use bounded incremental rendering so the initial overlay does not create hundreds of cards and tens of thousands of pixels of scroll content. Search and filters operate on the full shared catalog; rendering a window does not change result counts or query semantics.

## Acceptance

- Side-by-side screenshots at 1440x960 and 390x844 read as the same brand and component family as Tavernary.
- Tavernary's trihex, Inter typography, exact foundational tokens, card surfaces, kind colors, chips, controls, and filter treatment are visible in Companion.
- No critical header, route, filter, Kit, or lifecycle action is clipped by SillyTavern's native popup.
- Catalog freshness and manual refresh appear once.
- The initial Projects DOM is bounded while the result count remains authoritative.
- Projects, Kits, Installed, details, filter sheet, warning dialogs, and operation trays remain usable at desktop and mobile sizes.
- Installed-host Playwright reports no horizontal overflow, console error, page error, or failed catalog request.
