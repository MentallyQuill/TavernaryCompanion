# Companion Installed Artifact Evidence

Observed: 2026-08-18T16:39:00-06:00

## Installed artifact

- Version: `0.1.0-pre-alpha.1`
- Source branch: `codex/tavernary-visual-alignment`
- Host: SillyTavern `1.18.0` (`61ad2189f`)
- Isolated profile: `companion-acceptance-v1`
- Install path: `data/companion-acceptance-v1/extensions/TavernaryCompanion`
- Previous acceptance artifact backup: `extension-backups/TavernaryCompanion-before-brand-alignment-20260818-1629`

The installed `dist/extension.js` and `dist/companion.css` were hash-compared with the verified
workspace build after installation. The release now includes the Tavernary trihex PNG and the
Latin and Latin Extended Inter Variable font files under `dist/assets/`.

## Live Playwright proof

The installed launcher was opened through SillyTavern and exercised at `1440x960` and `390x844`.
The pass captured Projects, project detail, Kits, Installed, mobile Projects, the mobile filter
sheet, and mobile Kits.

| Context | Host dialog | Companion shell | Horizontal overflow | Mounted route content |
|---|---:|---:|---:|---|
| Desktop Projects | `1324.8 x 864` | `1276.8 x 842` | `0` | 30 project cards, 0 Kit cards |
| Desktop Kits | `1324.8 x 864` | `1276.8 x 842` | `0` | 0 project cards, 11 Kit cards |
| Desktop Installed | `1324.8 x 864` | `1276.8 x 842` | `0` | Installed route only |
| Mobile Projects | `358 x 812` | `310 x 790` | `0` | 30 project cards, 0 Kit cards |
| Mobile Kits | `358 x 812` | `310 x 790` | `0` | 0 project cards, 11 Kit cards |

Computed installed values matched Tavernary production:

- canvas: `rgb(13, 17, 23)`;
- font: `"Inter Variable", Inter, system-ui, sans-serif`;
- accent teal: `#2dd4bf`;
- functional orange: `#e18a24`.

The final pass recorded zero console errors, zero page errors, and zero failed requests. Evidence is
stored locally under `artifacts/brand-alignment-review/`, including `installed-evidence.json` and
the seven PNG captures.

## Automated gates

- `npm.cmd run check`: 61 test files and 195 tests passed, followed by a production build.
- `npm.cmd run test:e2e`: 22 Chromium tests passed before the final host-wrapper additions.
- Host-wrapper checks cover a large `1440x960` dialog and a bounded `390x844` dialog.
- The browser suite covers axe, reduced motion, 200% text, filter focus return, lifecycle journeys,
  Kit switching, bounded initial project rendering, and the Tavernary computed-style contract.

## Responsive conformance candidate

Observed: 2026-08-18T19:10:00-06:00

The responsive pass used live Tavernary.org at `390x844` and `1440x960` as the manual hierarchy
reference, then recorded deterministic local Playwright baselines for Projects at `390x844`,
`412x915`, `1024x768`, and `1440x960`. Separate mobile baselines cover the Project filter sheet,
Personal Kits, and Installed. The seven reviewed images are committed beside
`tests/e2e/responsive-conformance.spec.ts`.

The browser contract verifies:

- mobile Browse navigation replaces hidden desktop tabs;
- the first mobile project card begins no lower than `400px`, inside `12-16px` route gutters;
- compact mobile install actions remain at least `44x44px`;
- desktop retains the filter rail and reaches a three-column card grid at `1440x960`;
- document and shell horizontal overflow remain zero across six responsive viewports and at 200%
  text;
- filter focus restoration, detail Back restoration, reduced motion, and serious/critical Axe
  checks remain intact.

Candidate verification completed with `61` Vitest files / `203` tests and `34` Chromium tests,
including all seven screenshot comparisons without baseline updates. This is deterministic harness
proof. The earlier installed-host proof above remains evidence for the previous visual-alignment
artifact; the exact responsive candidate has not yet replaced that isolated installation.

The exact merged artifact must be rebuilt and hash-compared after merge; source-branch installed
proof is not a substitute for that final parity check.
