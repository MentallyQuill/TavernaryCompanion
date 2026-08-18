# Tavernary Companion V1 Release Readiness

Decision recorded: 2026-08-18T14:51:30-06:00

Status: **source-complete and packaged; not yet live-proven**.

## Proven

| Requirement | Evidence | Result |
|---|---|---|
| Tavernary source gate | 2,541 tests, production build, 403 static pages, export verification | Pass |
| Companion source gate | 61 test files, 183 tests, formatting, lint, typecheck, build | Pass |
| Shared CatalogCore behavior | Locked vendor files and shared fixtures in both repositories | Pass |
| Responsive browser gate | 17 Chromium tests across six required viewports, accessibility, Kit recovery/switching, motion, 200% text, performance | Pass |
| Release package | Exact three-entry ZIP; archive and file hashes verified | Pass |
| Isolated SillyTavern install | Extension discovered and all files served from acceptance-only profile | Pass |
| Installed file parity | Three installed hashes equal release manifest | Pass |
| Companion GitHub check | [PR #1](https://github.com/MentallyQuill/TavernaryCompanion/pull/1) check workflow | Pass |

## Not yet proven

| Requirement | Current blocker |
|---|---|
| Exact schema-7 catalog is live from intended Tavernary deployment SHA | [Tavernary PR #564](https://github.com/MentallyQuill/Tavernary/pull/564) is not yet merged/deployed. |
| Live catalog MIME, CORS, ETag/304, body hash, and CatalogCore parity | Requires the intended Pages deployment. |
| Installed launcher and interactive project/Kit journeys | In-app browser controller failed trusted-runtime startup. |
| Installed runtime responsive/focus/console/network proof | Same browser-controller blocker; fixture UI proof is not substituted. |

## Definition-of-done reconciliation

1. Phases 1–7 have passing source gates at recorded commits; Phase 8 remains in progress.
2. Tavernary Pages proof is pending deployment.
3. Shared CatalogCore fixtures pass.
4. The exact Companion release artifact is installed in an isolated profile.
5. Required lifecycle and Kit journeys pass against production services in the integrated simulated host, but not yet through the installed UI.
6. Required responsive browser acceptance passes against the production UI fixture.
7. Installed file hashes match; installed console proof is pending.
8. Source, GitHub checks, deployment, and installed runtime evidence are reported separately.

This is deliberately not a V1-complete declaration. Promotion requires updating the two evidence records after Pages deployment and installed interactive browser acceptance.
