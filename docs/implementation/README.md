# Tavernary Companion V1 Implementation Roadmap

This roadmap coordinates Tavernary's catalog foundation with Tavernary Companion's V1 extension. It is the sequencing and status authority. The [master design](../superpowers/specs/2026-08-18-tavernary-companion-design.md) remains authoritative for product scope and security; the [UX design index](../design/README.md) remains authoritative for user-facing behavior.

## Execution model

- Implement plans in numeric order unless a plan explicitly identifies a safe fixture-backed parallel path.
- Use test-driven development for every behavioral change: failing test, observed failure, minimal implementation, passing focused test, then broader gate.
- Commit at each task boundary using the commit named in that task.
- Do not mark a phase complete from source inspection alone. Run its exit gate and record the exact commit and evidence in this roadmap.
- Keep Tavernary source changes in `F:\git\Tavernary` and Companion source changes in `F:\git\TavernaryCompanion`.
- Never copy application code from Directive. Its geometry and host patterns are reference material only.
- Never modify unrelated dirty work in either repository.

## Status legend

- **Pending:** prerequisites or implementation remain.
- **In progress:** the current execution phase.
- **Verified:** focused and phase gates pass at the recorded commit.
- **Live proven:** the exact deployed or installed artifact has been exercised.

## Dependency order

| Phase | Plan | Depends on | Deliverable | Status |
|---:|---|---|---|---|
| 1 | [Tavernary foundation](01-tavernary-foundation.md) | Approved designs | Schema 7, install contracts, shared CatalogCore, living Pages asset | Verified |
| 2 | [Companion foundation](02-companion-foundation.md) | Phase 1 interfaces; fixtures may unblock work | Installable extension scaffold, host boundary, settings, build | Verified |
| 3 | [Catalog sync and discovery](03-catalog-sync-and-discovery.md) | Phases 1–2 | Validated cache, shared search/filter behavior, inventory reconciliation | Verified |
| 4 | [Responsive shell and catalog UI](04-responsive-shell-and-catalog-ui.md) | Phase 3 view models | Desktop/mobile shell and complete browse experience | Verified |
| 5 | [Project lifecycle and trust](05-project-lifecycle-and-trust.md) | Phases 2–4 | Verified install/remove flow, warnings, receipts, self-protection | Verified |
| 6 | [Kit domain and operations](06-kit-domain-and-operations.md) | Phase 5 lifecycle services | Stored Kits, planning, staged activation, reference-safe removal | Verified |
| 7 | [Kit experience and portability](07-kit-experience-and-portability.md) | Phase 6 | Kit browsing/editor, import/export, published-copy workflow | Verified |
| 8 | [Integration, release, and live proof](08-integration-release-and-live-proof.md) | Phases 1–7 | Full gates, installed artifact, responsive acceptance, Pages proof | In progress |

## Recorded execution evidence

### Phase 1 — Tavernary foundation

- Tavernary source commit: `714143a630387a68a6d2f6ea86efa56c58c5cc81`.
- Canonical catalog SHA-256: `D7138A693EF3F56141F2F5D8985FF0B39F51ABAE19969384C58ED8BB8DCEDFD1`.
- Catalog result: schema 7, 437 projects, 303 installable SillyTavern extensions, and 11 published Kits.
- Evidence bootstrap: 306 verified repository-root manifests and 24 unavailable results at recorded immutable heads.
- CatalogCore vendor lock: Companion commit `1ce0c84921fbe2c466b72ad833456824089a1818`, covering 26 files from the Tavernary commit above.
- Tavernary gate: formatting, lint, palette audit, catalog validation, 512 TavernKeeper summaries, 2,528 tests, production build, 403 static pages, and export verification passed.
- Deployment and live Pages response proof remain explicitly assigned to Phase 8.

### Phase 2 — Companion foundation

- Companion source commit: `1ce0c84921fbe2c466b72ad833456824089a1818`.
- Built JS SHA-256: `38012763BBF8BC9D761AD2C0FD1C0A4A311F5263C602482EA190D9FC47036820`.
- Built CSS SHA-256: `B37348130A3C1A9FCA3A7DB6CE1353C9F5FBA0D0AD06D24B2D2CB3017A724437`.
- Source gate: formatting, lint, typecheck, 25 tests, deterministic build, vendor-lock verification, and shared CatalogCore fixtures passed.
- The exact release artifact was discovered and served by an isolated SillyTavern profile with matching installed hashes. Interactive launcher proof remains a Phase 8 item because the available browser controller could not start.

### Phase 3 — Catalog sync and discovery

- Companion source commit: `5fa82b5c94cb4408d53dffce842173530ee0dd20`.
- Cache format: IndexedDB `tavernary-companion` version 1 with atomically activated current and previous slots.
- Contract gate: 12 shared behavior fixture cases represented by 3 fixture-contract tests; 39 focused catalog, cache, inventory, and discovery tests passed.
- Full canonical catalog: 5,506,526 bytes, 437 projects, and 11 published Kits parsed in 40.031 ms; the search index built in 56.286 ms.
- Default Companion query selected 351 SillyTavern extensions and presets in 3.049 ms.
- Production bundle sizes: 30,441-byte JavaScript and 1,488-byte CSS.
- Phase gate: formatting, lint, typecheck, focused tests, and production build passed.

### Phase 4 — Responsive shell and catalog UI

- Companion source commit: `e753a45d5de952653ee5228b591696e00cd2901d`.
- Responsive geometry passed at 1440x960 (1325x864), 1366x768 (1257x691), 1024x768 (942x691), 800x600 (736x540), 412x915 (412x915), and 390x844 (390x844).
- Every target reported zero document and shell horizontal overflow with the Alpha lifecycle action visible; the 390x844 route also passed at 200% root text size.
- Accessibility gate: zero serious or critical axe violations, compact filter focus trap/Escape restoration passed, and reduced motion produced no transform with at most 0.01 ms transition duration.
- A 437-card default result set did not mount detail content eagerly and completed a query/render update within the 150 ms budget, so virtualization was not introduced.
- Phase gate: formatting, lint, typecheck, 87 unit/contract tests, production build, and 11 Chromium responsive/accessibility tests passed.
- Production bundles at this phase: 82,394-byte JavaScript and 13,910-byte CSS.

### Phase 5 — Project lifecycle and trust

- Companion source commit: `f4ce09dc5c0f83b2d0d3ae7c55b43b298eb24854`.
- Lifecycle policy allows mutations only for validated SillyTavern extension contracts, prevents Companion self-lifecycle, serializes operations, and records verified receipts.
- First-install unsandboxed disclosure and every-install material/high concern confirmation are covered with exact warning-copy tests and a Scan Review route.
- Managed removal, external-install protection, install verification mismatch, host rejection, and self-protection passed focused and integrated scenarios.

### Phase 6 — Kit domain and operations

- Companion source commit: `7e59cad`.
- Strict versioned Kit persistence, reference counts, deterministic planning, stale-plan detection, activation barriers, durable journals, one-reload execution, interruption recovery, and drift reconciliation are implemented.
- Shared, externally installed, and manually managed extensions are preserved. Activating the already-active healthy Kit produces no mutation plan.

### Phase 7 — Kit experience and portability

- Companion source commit: `433bc60`.
- Published and personal Kit browsing, compact filters, inspectors, personal editing, preflight review, progress, receipts, strict JSON import/export, and copy-to-personal behavior are implemented.
- Tavernary Companion is excluded from Kit membership. The local schema retains V2 publication provenance fields without exposing submission UI or transport.
- Desktop and mobile Kit actions passed at 1024x768 and 390x844 as part of the 13-test browser gate.

### Phase 8 — Integration, release, and live proof

- Companion release source commit: `b4e330debcab8f508c0deaa4366f49101ff6861f`.
- Release: `tavernary-companion-0.1.0-pre-alpha.1.zip`, SHA-256 `a7657ee6ad4dd4d2412659f60564f322aa4e0db9a3022d65ec1eb59aa64d817b`, containing exactly three installable files.
- Fresh Companion gate: formatting, lint, typecheck, 58 test files/159 tests, production build, 13 Chromium responsive/accessibility tests, and release verification passed.
- Exact release files were installed into the isolated `companion-acceptance-v1` profile; SillyTavern discovered the extension and served all three files with byte-identical hashes.
- Companion CI passed on [PR #1](https://github.com/MentallyQuill/TavernaryCompanion/pull/1).
- Tavernary [PR #564](https://github.com/MentallyQuill/Tavernary/pull/564) contains the schema-7 publication. Its current branch passed the full local Tavernary gate after refreshing eight install-evidence records; GitHub verification and merge/deployment remain pending.
- Installed interactive launcher/console/network journeys remain unproven because the in-app browser controller failed during trusted-runtime startup. See the [installed evidence](evidence/companion-installed-v1.md) and [readiness reconciliation](evidence/v1-release-readiness.md).

## Critical path

```text
Tavernary install evidence + schema 7
  -> CatalogCore package + canonical public asset
  -> Companion scaffold + host adapter
  -> catalog cache/search/inventory
  -> responsive browse shell
  -> individual lifecycle/trust
  -> Kit planner/executor
  -> Kit UI/import/export
  -> installed and deployed acceptance
```

The Companion may use committed schema-7 fixtures while Phase 1 publication is pending. No live-catalog or release claim is allowed until Phase 1 is deployed and Phase 8 verifies its exact Pages SHA.

## Design coverage

| Design responsibility | Implementation authority |
|---|---|
| Delivery boundary and repository ownership | Roadmap; Phases 1–2 |
| Canonical catalog publication and schema compatibility | Phases 1 and 3 |
| Shared search, filter, sort, and Kit selection behavior | Phases 1 and 3 |
| Install eligibility and contract validation | Phases 1 and 5 |
| TavernKeeper disclosures and warnings | Phase 5; consolidated Kit warnings in Phase 7 |
| Individual install/remove and managed ownership | Phases 3 and 5 |
| Personal/published Kit state and safe operations | Phases 6–7 |
| V2-compatible local Kit data without V2 transport | Phases 6–7 |
| Desktop/mobile shell, accessibility, and motion | Phase 4; Kit UI extension in Phase 7 |
| Offline, corruption, interruption, and schema recovery | Phases 3, 5, and 6 |
| Unit, contract, simulated-host, browser, live Pages, and installed-artifact verification | Phase 8 |

## Repository boundaries

### Tavernary

- Owns `packages/catalog-core`, catalog schemas, install-contract generation, shared contract fixtures, and `public/catalog/tavernary-catalog.json`.
- Its website imports the same generated asset Pages serves.
- Routine catalog publication changes data, not Companion executable code.

### Tavernary Companion

- Owns the extension manifest and bundle, catalog transport/cache, SillyTavern adapter, profile state, lifecycle policy, Kit state machine, UI, and release artifact.
- Vendors CatalogCore only through the locked sync command. Runtime network code never loads JavaScript or schemas as executable compatibility updates.
- Treats all catalog data and imported Kit JSON as untrusted.

## Global implementation constraints

- Runtime target: modern browsers supported by SillyTavern 1.12.0 or newer.
- Development runtime: Node.js 24, TypeScript, Vitest, jsdom, Preact, esbuild, and Playwright.
- Produced extension files: `manifest.json`, `dist/extension.js`, `dist/companion.css`, and static assets only.
- Canonical catalog URL: `https://tavernary.org/catalog/tavernary-catalog.json`.
- Supported catalog schema in V1: exactly `7`.
- Companion canonical project ID: `mentallyquill-tavernary-companion`.
- SillyTavern canonical frontend project ID: `sillytavern-sillytavern`.
- Only validated SillyTavern extension install contracts are actionable.
- Kit operations never mutate externally installed extensions.
- Companion never installs, removes, enables, disables, or updates itself.
- Third-party extension updates remain owned by SillyTavern.
- At most one lifecycle operation runs at a time and at most one page reload occurs for one approved Kit operation.

## Shared test fixtures

`Tavernary/packages/catalog-core/fixtures/` is the fixture authority. The Companion sync task copies the fixtures with the package and records SHA-256 hashes in `vendor/tavernary-core.lock.json`. Both repositories must run:

- Catalog schema acceptance and rejection cases.
- Search grammar, including AND terms and `+` union clauses.
- Project filter/sort cases.
- Kit filter/sort cases.
- Install-contract eligibility and rejection cases.
- TavernKeeper concern/freshness projection cases.

## Global definition of done

V1 is complete only when all of the following are true:

1. Every phase exit gate is green at a recorded commit.
2. Tavernary's exact deployed SHA serves the canonical schema-7 asset with correct MIME type, CORS, and conditional ETag behavior.
3. Tavernary and Companion pass the same CatalogCore fixtures.
4. The exact Companion release artifact installs into an isolated SillyTavern profile.
5. Individual install, warning, direct removal, Kit activation failure, shared-member uninstall, offline refresh, and incompatible-schema journeys pass in the installed artifact.
6. Responsive browser acceptance passes at 1440x960, 1366x768, 1024x768, 800x600, 412x915, and 390x844, plus keyboard, reduced-motion, and enlarged-text checks.
7. Installed production-file hashes match the release artifact and the browser console contains no unexpected errors.
8. Source repository, GitHub publication, Pages deployment, and installed runtime evidence are reported separately.

## Out of scope for these plans

- Installing presets, frontends, or extensions for other frontends.
- Fork-name detection or fork-specific behavior.
- Third-party extension update implementation.
- Companion self-update.
- V2 Kit submission UI, authentication, or transport.
