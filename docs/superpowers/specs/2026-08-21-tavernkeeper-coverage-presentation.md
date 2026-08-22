# TavernKeeper Coverage Presentation

## Goal

Show players what TavernKeeper observed and whether JavaScript/TypeScript analysis completed, without treating ordinary scanner limitations as evidence of danger.

## Contract

- Companion consumes Tavernary Catalog v8 and continues to open a valid v7 cache while it immediately refreshes.
- `complete`, `incomplete`, `legacy`, and unavailable-from-v7 are distinct states.
- Low risk is labeled “Low concern observed.”
- Incomplete coverage is labeled “Scan incomplete” with this explanation: “TavernKeeper found low concern in the code it analyzed. Parts of the JavaScript/TypeScript scan were incomplete, so this is not a complete result.”
- Legacy is labeled “Coverage not recorded.” A v7 cache is labeled “Coverage unavailable in cached catalog.”
- Coverage appears in the scan trigger’s accessible name, popover, history entries, and version-choice scan panel.
- Incomplete-low remains informational. Only material/high risk uses the existing assessment-warning confirmation.

## Visual treatment

- Preserve the risk color as the primary indicator.
- Add a neutral secondary limited-coverage marker; do not reuse orange or red danger semantics.
- Keep freshness clocks and wording independent.

