# Companion Installed Artifact Evidence

Observed: 2026-08-18T13:18:14-06:00

## Artifact identity

- Version: `0.1.0-pre-alpha.1`
- Source commit: `b4e330debcab8f508c0deaa4366f49101ff6861f`
- Archive: `artifacts/tavernary-companion-0.1.0-pre-alpha.1.zip`
- Archive SHA-256: `a7657ee6ad4dd4d2412659f60564f322aa4e0db9a3022d65ec1eb59aa64d817b`
- Verified entries: `dist/companion.css`, `dist/extension.js`, and `manifest.json`; no other archive entries exist.

## Isolated host

The archive was extracted into the acceptance-only SillyTavern profile `companion-acceptance-v1` at:

`F:\SillyTavern\SillyTavern\data\companion-acceptance-v1\extensions\TavernaryCompanion`

The profile was created and authenticated through SillyTavern's own account/API flow. No existing user profile was used or modified.

`/api/extensions/discover` returned the installed extension as `third-party/TavernaryCompanion` with type `local` and the expected manifest path. The authenticated profile served all three production paths with HTTP 200:

- `/scripts/extensions/third-party/TavernaryCompanion/manifest.json`
- `/scripts/extensions/third-party/TavernaryCompanion/dist/extension.js`
- `/scripts/extensions/third-party/TavernaryCompanion/dist/companion.css`

Response bytes matched the installed files.

## Installed hash parity

| File | Bytes | Release and installed SHA-256 |
|---|---:|---|
| `dist/companion.css` | 20,854 | `76ac2fec68d9d9011c681a28806b36231f9b53417e836f4bfba27fbfc4ec0abb` |
| `dist/extension.js` | 314,687 | `548f5e473e6d6dd5237e432adcb5edbe9bff8bef99936eda11975f55ada8cb64` |
| `manifest.json` | 684 | `caf9d09c29aa66e4f852d38bf84fc44be73fa3d8c76d3c02ae30c754fed16084` |

Hashes were checked again after the source and browser gates; all remained identical.

## Behavior evidence and limit

Production coordinators passed integrated lifecycle and Kit scenarios in the simulated SillyTavern host. The production UI passed 13 Chromium tests at all required responsive sizes, including Kit actions, focus/Escape behavior, axe, reduced motion, 200% text, and the catalog performance budget.

These are separate from installed-runtime interaction. The in-app browser controller could not start because its trusted RPC dependency did not resolve within the configured trusted code path. Consequently, this record proves installation, discovery, serving, and byte parity, but does **not** claim:

- clicking the installed launcher;
- installed overlay geometry or focus behavior;
- installed console-error count;
- installed runtime catalog/lifecycle/Kit network journeys.

Those items remain explicit release-readiness gaps rather than being inferred from the fixture browser suite.
