# Tavernary Companion Overlay Polish Design

## Goal

Make Tavernary Companion feel like a purpose-built Tavernary surface inside SillyTavern: one compact overlay, not a full website squeezed into a second grey popup. Preserve the catalog, lifecycle, trust, inventory, and Kit domain boundaries while aligning every applicable visual and interaction seam with current Tavernary source.

## Visual authority

1. Current source under `F:\git\Tavernary`, especially the catalog header, filter controls, Kit filters, cards, buttons, typography, and responsive rules.
2. Current SillyTavern popup implementation and CSS under `F:\SillyTavern\SillyTavern\public\scripts\popup.js` and `public\css\popup.css`.
3. The supplied desktop screenshot as evidence of the double-panel, oversized-text, and density failures.
4. Companion's existing lifecycle, trust, Kit, inventory, accessibility, and self-protection behavior.

## Overlay boundary

The SillyTavern native dialog remains the lifecycle owner, but its visible grey container, border, padding, and shadow are removed for the Companion instance. The Companion root becomes the only visible panel. Its backdrop uses a deliberate dark tint and blur so SillyTavern remains recognizable but visually recedes.

The native close control becomes a large grey circular button visually outside the Companion panel. It remains inside the viewport and safe area at desktop and mobile sizes, has a 44px or larger target, a visible focus indicator, and the native close semantics. Pointer activation on the native dialog backdrop closes Companion; pointer activation inside the root never does. Escape and launcher focus restoration continue to use the native popup lifecycle.

## Shared shell and typography

The brand row contains the Tavernary mark and `Tavernary` wordmark only. Remove the `Companion` qualifier and the `Where AI roleplay tools gather` tagline. Retain search, catalog freshness, and refresh, but use explicit Tavernary-sized typography and compact button dimensions so host CSS cannot inflate them.

Use the bundled Inter Variable font and current Tavernary token values. Audit every root control to ensure SillyTavern inherited styles cannot change font family, font size, line height, border, radius, opacity, alignment, or button treatment. Remove the clipped teal inset edge and octagonal panel treatment. Use one restrained surface border/radius and overlay shadow.

## Project cards

Installed projects receive a subtle teal illuminated edge and restrained glow. This indicates local installed state only and does not imply safety or endorsement.

The whole non-control card surface opens the canonical repository. The implementation must avoid the current full-card pseudo-element hit-target bug: pointer cursor, hover, focus, and activation must be stable over the card body, while install/uninstall, Kit, scan, and other nested controls remain independent and never open the repository. Playwright must exercise blank card space, title, every nested control, cursor computation, popup/new-page behavior, and keyboard focus.

## Kits

The Kits route opens on Personal by default and presents Personal before Published. Kit descriptions are left aligned.

Published Kit filters reuse Tavernary's current filter grammar rather than comma-separated fields: searchable counted frontend choices, purpose chips, model-family chips, a searchable single project selector, dual Kit-size range, availability status, clear controls, and the same desktop rail/mobile sheet behavior as project filters. Filter facets and counts are derived from actual catalog projects and Kits.

## Installed route

Installed extensions render as Tavernary-family cards, not rows. Sections retain the distinctions between Companion-managed, externally installed, unknown, and attention-required inventory without creating large nested panels.

Installed Kits appear first as visibly grouped Kit cards. Each Kit card lists its component projects, operational state, and active state. Extension cards display membership in installed Kits when applicable. Locally toggleable extensions expose an Enable/Disable switch that calls the existing host adapter, refreshes inventory, reports failure through the existing operation error surface, and preserves the extension's original state during automated playtesting. Tavernary Companion itself and non-toggleable/missing records do not expose a self-disabling switch.

## Responsive behavior

Desktop uses a single centered overlay with the floating close control outside its top-right edge. Mobile uses the same single surface, sized to the viewport and safe areas, with the close control remaining reachable and visually separate. Each route keeps one vertical scroll owner. No document, dialog, shell, route, card, filter sheet, or popover creates horizontal overflow at target viewports or 200% text.

## Playwright release gate

The deterministic repo harness covers geometry, visual baselines, accessibility, and interactions. In addition, install the packaged branch artifact into a known local SillyTavern profile after backing up the exact installed extension directory, then run Playwright against the real SillyTavern UI.

The installed-host playtest covers:

- opening and closing through launcher, external close, Escape, and backdrop;
- backdrop blur and transparent native wrapper at desktop and mobile viewports;
- search, category navigation, filters, sorting, routes, and all card interactions;
- card cursor and hit-target behavior on body, title, scan, install/uninstall, and Kit controls;
- Personal Kits default, Published filter operation, Kit details, and installed Kit grouping;
- extension Enable/Disable toggling with original state restored;
- keyboard focus order/restoration, touch target sizes, reduced motion, and 200% text;
- page errors, console errors, failed requests, clipping, and horizontal overflow.

Repository-harness proof and installed-host proof are recorded separately. No release is merged until both are green or a concrete external host blocker is documented.

## Integration

Work stays on the isolated `codex/tavernary-ui-parity` worktree. Preserve all unrelated changes in the primary checkout. After full verification, synchronize with current remote `main`, update the existing PR, merge it, verify the exact remote `main` SHA, and confirm post-merge checks without force-pushing.
