# Companion Installed Artifact Evidence

Observed: 2026-08-18T15:22:42-06:00

## Artifact identity

- Version: `0.1.0-pre-alpha.1`
- Source commit: `fcf15366ded8715b492e024ebe555a049d185369`
- Archive: `artifacts/tavernary-companion-0.1.0-pre-alpha.1.zip`
- Archive SHA-256: `56c4e3621fcdee498e84c7e0104f010a77656f43002e4d8c0e1fad5f9ea57f04`
- Verified entries: `dist/companion.css`, `dist/extension.js`, and `manifest.json`; no other archive entries exist.

## Isolated host

The archive was extracted into the acceptance-only SillyTavern profile `companion-acceptance-v1` at:

`F:\SillyTavern\SillyTavern\data\companion-acceptance-v1\extensions\TavernaryCompanion`

The profile was created and authenticated through SillyTavern's own account/API flow. No existing user profile was used or modified.

The prior acceptance install was moved intact to `acceptance-backups/TavernaryCompanion-20260818-152221` before this archive was extracted.

`/api/extensions/discover` returned the installed extension as `third-party/TavernaryCompanion` with type `local` and the expected manifest path. The authenticated profile served all three production paths with HTTP 200:

- `/scripts/extensions/third-party/TavernaryCompanion/manifest.json`
- `/scripts/extensions/third-party/TavernaryCompanion/dist/extension.js`
- `/scripts/extensions/third-party/TavernaryCompanion/dist/companion.css`

Response bytes matched the installed files.

## Installed hash parity

| File | Bytes | Release and installed SHA-256 |
|---|---:|---|
| `dist/companion.css` | 22,321 | `58abcee8b667743516ed25763c9f14f7734eb1080c7649851c5b60cf3c8411a0` |
| `dist/extension.js` | 615,486 | `a7e8893b889a145069239acc2e6dbbe7e57ceab5dc6af641bdebef6af97713aa` |
| `manifest.json` | 684 | `caf9d09c29aa66e4f852d38bf84fc44be73fa3d8c76d3c02ae30c754fed16084` |

Hashes were checked again after the source and browser gates; all remained identical.

## Behavior evidence and limit

Production coordinators passed integrated lifecycle and Kit scenarios in the simulated SillyTavern host. The production UI passed 17 Chromium tests at all required responsive sizes, including Kit activation/deactivation/reactivation, shared-member preservation, failure and interruption recovery, personal Kit editing/import, focus/Escape behavior, axe, reduced motion, 200% text, and the catalog performance budget.

These are separate from installed-runtime interaction. The in-app browser controller could not start because its trusted RPC dependency did not resolve within the configured trusted code path. Consequently, this record proves installation, discovery, serving, and byte parity, but does **not** claim:

- clicking the installed launcher;
- installed overlay geometry or focus behavior;
- installed console-error count;
- installed runtime catalog/lifecycle/Kit network journeys.

Those items remain explicit release-readiness gaps rather than being inferred from the fixture browser suite.
