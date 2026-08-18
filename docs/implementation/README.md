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
| 1 | [Tavernary foundation](01-tavernary-foundation.md) | Approved designs | Schema 7, install contracts, shared CatalogCore, living Pages asset | Pending |
| 2 | [Companion foundation](02-companion-foundation.md) | Phase 1 interfaces; fixtures may unblock work | Installable extension scaffold, host boundary, settings, build | Pending |
| 3 | [Catalog sync and discovery](03-catalog-sync-and-discovery.md) | Phases 1–2 | Validated cache, shared search/filter behavior, inventory reconciliation | Pending |
| 4 | [Responsive shell and catalog UI](04-responsive-shell-and-catalog-ui.md) | Phase 3 view models | Desktop/mobile shell and complete browse experience | Pending |
| 5 | [Project lifecycle and trust](05-project-lifecycle-and-trust.md) | Phases 2–4 | Verified install/remove flow, warnings, receipts, self-protection | Pending |
| 6 | [Kit domain and operations](06-kit-domain-and-operations.md) | Phase 5 lifecycle services | Stored Kits, planning, staged activation, reference-safe removal | Pending |
| 7 | [Kit experience and portability](07-kit-experience-and-portability.md) | Phase 6 | Kit browsing/editor, import/export, published-copy workflow | Pending |
| 8 | [Integration, release, and live proof](08-integration-release-and-live-proof.md) | Phases 1–7 | Full gates, installed artifact, responsive acceptance, Pages proof | Pending |

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
