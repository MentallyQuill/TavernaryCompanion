# Tavernary Companion V1 Design

**Date:** 2026-08-18

**Status:** Design sections approved in conversation; awaiting written-spec review

**Repositories:** `MentallyQuill/Tavernary` and `MentallyQuill/TavernaryCompanion`

## Summary

Tavernary Companion is a SillyTavern extension that presents Tavernary's live catalog in a compact, Directive-inspired overlay. It preserves Tavernary's search, filters, sorting, project details, Kits, and TavernKeeper assessments while adding SillyTavern-aware extension installation, removal, and Kit switching.

Tavernary remains the sole catalog authority. Its existing generated catalog becomes one named public GitHub Pages asset used by both the Tavernary website and Companion. Shared headless catalog code remains in Tavernary and is consumed by Companion from an exact Git revision. Companion never creates, transforms, or publishes a secondary catalog.

V1 manages only verified SillyTavern extensions. Presets and projects for other frontends remain discoverable but browse-only. Personal Kits are local and portable. A future V2 may submit personal Kits through Tavernary's existing GitHub issue workflow, but V1 contains no submission UI or transport.

## Goals

- Browse Tavernary from inside SillyTavern with full search, filtering, sorting, project, Kit, and assessment information.
- Default discovery to the SillyTavern frontend and extension/preset kinds while allowing users to explore all frontends and project kinds.
- Offer one-control installation and removal for eligible SillyTavern extensions after required trust and risk disclosures.
- Offer explicit exact-version updates for catalog-matched local extensions without changing external ownership.
- Save, export, install, activate, deactivate, uninstall, and switch personal or published Kits.
- Protect extensions installed outside Companion from Kit-driven changes.
- Refresh the living Tavernary catalog several times per day without releasing Companion.
- Work wherever the standard SillyTavern extension contract works, including compatible forks, without host-name detection or fork-specific branches.
- Provide responsive, accessible desktop and mobile behavior with real browser verification.
- Preserve a clean V2 path for Tavernary Kit submission.

## Non-goals for V1

- Installing presets, frontends, or non-SillyTavern extensions.
- Bulk updates, automatic update polling, and rollback or downgrade controls.
- Accounts, cloud Kit synchronization, or a Companion backend.
- Direct Kit submission to Tavernary.
- Fork-specific compatibility logic or named-host allowlists.
- Runtime loading or execution of JavaScript from Tavernary.
- Atomic rollback of already cloned repositories after a partial Kit failure.
- Allowing Companion to install, remove, enable, disable, or Kit-manage itself.

## Delivery boundary

The product has two coordinated implementation workstreams:

1. **Tavernary foundation:** expose the canonical catalog asset, extract the headless catalog core, and generate verified install contracts.
2. **Companion V1:** build the SillyTavern adapter, cache, managed-state model, Kit planner/executor, and responsive overlay.

The public catalog and shared core are prerequisites for live Companion catalog behavior. Companion development may use fixtures before that foundation is deployed.

## Ownership and architecture

### Tavernary owns

- The canonical catalog build and public catalog content.
- Catalog schemas, types, search grammar, indexing, filters, sorting, and published Kit selection.
- TavernKeeper assessment projection and scan links.
- Validation and generation of SillyTavern extension install contracts.
- Published Kit validation, moderation, and GitHub submission workflows.

### Tavernary Companion owns

- Catalog fetching, compatibility checks, validation, caching, and recovery.
- The SillyTavern overlay and all responsive interaction behavior.
- Installed-extension discovery and lifecycle requests.
- Companion-managed extension ownership.
- Personal Kit persistence, export, and operational state.
- Kit planning, preflight, sequential execution, failure receipts, and reload coordination.
- Trust disclosures and install-time assessment warnings.

### Component boundaries

- **CatalogClient:** conditionally fetches the catalog, validates the supported schema, and atomically maintains the last-known-good cache.
- **CatalogCore:** Git-sourced, pure headless Tavernary code for schema types, validation, search, query parsing, filtering, sorting, and Kit selection.
- **HostExtensionAdapter:** wraps the standard SillyTavern discovery, install, delete, enable, and disable interfaces. It does not inspect host branding.
- **ManagedExtensionRegistry:** records which catalog projects the user explicitly placed under Companion management.
- **KitStore:** stores profile-local Kit definitions, export metadata, and operational state.
- **KitPlanner:** compares the requested Kit with current installed, enabled, managed, and Kit-reference state and produces a read-only plan.
- **KitExecutor:** executes an approved plan sequentially, preserves the active Kit until a commit point, records outcomes, and coordinates one reload.
- **CompanionShell:** owns the popup lifecycle, navigation, rendering, focus, history, and responsive geometry.

No component other than `HostExtensionAdapter` knows SillyTavern endpoint details. No component other than `CatalogClient` knows catalog transport or cache details. Search and selection semantics remain in `CatalogCore`, not UI components.

## Canonical catalog publication

Tavernary publishes one living asset at:

`https://tavernary.org/catalog/tavernary-catalog.json`

The filename is stable and human-readable. Daily publications replace the same asset. The schema version does not change for content refreshes.

Tavernary's catalog build writes one physical generated JSON file under `public/catalog/`. The Tavernary website loads that exact file during its static build, and GitHub Pages publishes the same bytes. Tests must fail if the website input and deployed artifact diverge.

The top-level catalog retains at least:

```json
{
  "schemaVersion": 7,
  "generatedAt": "2026-08-18T08:15:48.000Z",
  "projects": [],
  "kits": []
}
```

`schemaVersion` describes the data contract generation. It is independent of the stable filename, deployment count, `generatedAt`, and HTTP ETag. The Tavernary foundation work increments the current schema from 6 to 7 because verified install contracts become part of the canonical catalog contract; routine catalog publications remain schema 7.

Companion uses conditional HTTP requests. A `304` retains the cache. A changed response is parsed and validated before it can replace the cache. Network, parse, schema, or validation failure preserves the previous cache.

### Schema incompatibility

Companion bundles the set of catalog schema versions it understands. Tavernary only serves the current schema; it does not maintain compatibility feeds.

When a fetched catalog has a newer unsupported schema, Companion retains the last compatible catalog in browse-only mode and pauses installs and Kit changes. It shows:

> **Catalog update requires a newer Companion**
>
> Tavernary has published catalog schema 8. This version of Tavernary Companion supports schema 7. Update Tavernary Companion before refreshing the catalog.
>
> Your last compatible catalog remains available for browsing, but installation and Kit changes are paused.

Actions are **Update Companion**, **Use cached catalog**, and, when no compatible cache exists, **Open Tavernary**. Updating hands off to SillyTavern's extension manager. Companion never downloads a remote schema or remote code and pretends that old application logic has become compatible.

## Shared catalog core

Tavernary contains a framework-neutral catalog-core package with no Next.js, React, DOM, filesystem, or host dependencies. It exports catalog types, validators, search/index construction, query parsing, filter and sort selectors, and Kit selectors.

Companion consumes catalog-core from an exact Tavernary Git commit and bundles it into the released extension. The dependency lock records the commit and expected package hashes. The build fetches that exact revision and fails on hash mismatch. Routine catalog publications do not change or refetch core code for installed users; only Companion releases can change executable code.

Both repositories run the same behavioral fixtures. A change to search, filters, sorting, schema semantics, or Kit selection is incomplete until Tavernary and Companion contract tests agree.

## Install eligibility and contract

Only an active, published, repository-root SillyTavern extension with a validated manifest receives an install contract. Presets, frontends, non-SillyTavern extensions, organization pages, unavailable projects, and sources that cannot prove the contract remain browse-only.

The V1 contract contains:

```json
{
  "kind": "sillytavern-extension-git",
  "repositoryUrl": "https://github.com/owner/repository.git",
  "branch": null,
  "manifestPath": "manifest.json",
  "folderName": "repository"
}
```

The Tavernary build validates the URL, scheme, repository identity, repository-root manifest, optional branch, and expected installation folder. Credential-bearing URLs, arbitrary user URLs, and non-HTTP(S) schemes are never accepted. Companion treats catalog data as untrusted input and validates the contract again before calling the host adapter.

The project flow is:

`catalog entry -> install-contract validation -> warning policy -> user approval -> host adapter -> installed-state rediscovery`

## Trust and TavernKeeper warnings

The first eligible installation requires a one-time per-profile disclosure that extensions execute unsandboxed code inside SillyTavern. After acknowledgement, low-concern eligible projects can use direct one-control actions.

Every installation of a project whose latest available TavernKeeper assessment is **Material concern** or **Immediate danger** requires a fresh confirmation. Kit preflight consolidates all flagged members into one dialog rather than interrupting once per extension.

The approved base copy is:

> TavernKeeper’s latest assessment identified potential security concerns in this project. Extensions can run code inside SillyTavern. Responsibility for safety falls upon you. Review the scan and project before continuing.

The primary evidence action is **Scan Review**, followed by **Cancel** and **Install anyway**. Immediate-danger presentation uses Tavernary's exact risk label and stronger visual emphasis. If the assessment is stale, “latest assessment” becomes “latest available assessment” and the dialog adds: “This assessment covers an older version of the project.”

Warnings do not claim that low concern means safe, that a finding proves exploitation, or that scanning guarantees safety.

## Project lifecycle

Eligible project cards expose one primary state-aware action: **Install** or **Uninstall**. Browse-only projects expose **View project**. Installed projects show whether they are Companion-managed or externally installed.

Kit operations never modify an external installation. A direct individual action may remove an external installation because the user explicitly requested that exact project operation.

Installed-extension updates remain in SillyTavern's native extension manager. Companion may display installed state but does not implement third-party update logic in V1.

### Companion self-protection

Companion's canonical Tavernary project ID is a constant shared by UI, validation, planning, and lifecycle services. Display names and folder names are not identity.

- Its card says **Current extension** and offers only **View project** and **Manage in SillyTavern**.
- Install, uninstall, enable, disable, and managed-ownership operations are rejected at the service layer.
- Personal Kit builders cannot add Companion.
- Stored Kit definitions containing Companion are rejected with a specific validation error.
- If an externally published Tavernary Kit contains Companion, it is treated as already satisfied context and excluded from all operations.

## Kit model and behavior

### Personal storage

Personal Kits are stored in the current SillyTavern user profile. Catalog cache data is public and may use IndexedDB; personal Kits, trust acknowledgement, active/installed Kit identities, and the managed registry use profile-scoped extension settings.

The portable Kit document contains a local format version, local UUID, title, description, ordered canonical Tavernary project IDs, target frontend, creation/update timestamps, and origin metadata. Legacy imported origins remain readable, but the current public workflow is export-only. The document never contains host paths, credentials, enabled state, operation history, or other machine-specific data.

Published Tavernary Kits are read-only. Users may install or activate them directly and may copy them into editable personal Kits. Personal Kits support creation through the Kit Builder, rename, edit, duplicate, export, and remove.

### Operations

- **Install Kit:** installs missing eligible members and records the Kit as installed.
- **Activate Kit:** installs any still-missing members, enables its managed members, and disables managed members exclusive to the previously active Kit.
- **Deactivate Kit:** disables its managed members but retains repositories for fast switching.
- **Uninstall Kit:** removes managed members not referenced by another installed Kit.
- **Remove Kit:** deletes a saved personal definition without touching extensions.

Exactly one Kit may be active. Multiple Kits may remain installed. Frontend and browse-only members are context, not lifecycle targets.

### Preflight and staged activation

Only one lifecycle operation runs at a time. Preflight is read-only and lists installs, enables, disables, removals, shared members, already installed members, external installs, unavailable members, invalid contracts, and scan warnings.

Activation proceeds in stages:

1. Install missing eligible extensions sequentially.
2. Rediscover and verify every required extension.
3. If every required extension is available, enable the requested managed set, disable previous-Kit managed members that are no longer desired, and update the active-Kit marker.
4. Reload SillyTavern once if required.

If a required installation or verification fails, the prior active Kit and active marker remain unchanged. Successful partial clones are recorded and reported but are not rolled back or represented as an active Kit. Every operation produces a per-project receipt that remains visible until dismissed.

## V2 Kit submission compatibility

V1 includes no submission button, GitHub handoff, authentication, or dormant transport. Its portable Kit model nevertheless preserves the data required to project a personal Kit into Tavernary's current submission manifest.

V2 can implement:

`personal Kit -> Tavernary submission draft -> shared validation -> user review -> GitHub Kit-submission form`

The projection adds `operation`, optional published `kit_id`, title, description, and ordered `project_ids`. For Companion-created Kits, the SillyTavern frontend is first context and is never installed. At submission time, Tavernary's current shared rules validate 3–50 published projects, exactly one frontend first, at least two non-frontends, no duplicates, valid text, and moderation policy.

Private V1 Kits are not unnecessarily restricted by future publication rules. Operational and machine-local state is never projected into a public submission.

## User interface

Companion opens in a managed native SillyTavern popup. It uses Directive-inspired compact chrome, beveled surfaces, and clear state colors without copying Directive's campaign domain or large LCARS layout. Tavernary retains its own content vocabulary and neutral activity/security semantics.

Primary routes are **Projects**, **Kits**, and **Installed**. The persistent header contains search, catalog freshness, manual refresh, **Open Tavernary**, and close/back controls.

### Projects

The default query selects the SillyTavern frontend and extension/preset kinds. Users may clear those defaults and explore the complete catalog. Search grammar, active filters, all Tavernary facets, and sorting come from CatalogCore.

Cards contain the project name, compact summary, kind, frontend, TavernKeeper state, installed state, and one primary action. Selecting a card opens details without losing query, scroll, or focus state.

### Kits

Published and personal Kits share the Kit browser and clearly show origin, installed state, and active state. Editing is available only for personal Kits or a personal copy of a published Kit.

### Responsive geometry

The desktop shell is intentionally larger than Directive:

- Width: `min(92vw, 1440px)`
- Height: `min(90dvh, 960px)`
- Centered with visible SillyTavern context around it

Layout adapts by actual container width:

- Above 1200px: filter rail and three card columns.
- 900–1199px: collapsible filters and two columns.
- 720–899px: compact tablet sheet and one column.
- Below 720px: full-width, full-height mobile sheet with safe-area padding.

Navigation and search remain sticky while results scroll inside the shell. Details use a desktop drawer and nested mobile view. Mobile behavior includes Back handling, focus restoration, touch-sized controls, and preserved result scroll. The layout responds to browser viewport size, zoom, mobile browser chrome, and on-screen keyboards through dynamic viewport units and container-aware breakpoints.

## Accessibility and motion

- Complete keyboard operation and visible focus.
- Managed focus trap while open and opener-focus restoration on close.
- Accessible names and status text independent of color.
- Dialog headings and descriptions wired through ARIA.
- Assessment history and external links labeled with destination and state.
- Minimum touch target sizing on compact layouts.
- Reduced-motion behavior that removes nonessential transitions without hiding state changes.
- Contrast validated in supported SillyTavern themes.

## Error handling

- Catalog network failure uses the last valid compatible cache; without one, Companion offers retry and **Open Tavernary**.
- Invalid or incompatible catalog data never replaces the cache.
- Unsupported schemas make cached data browse-only.
- Host failures show the operation, project, safe response details, and retry eligibility without exposing credentials or full server internals.
- Kit operations continue independent installation attempts where safe, then stop before the activation commit point if any required member is unavailable.
- Uninstall preserves shared Kit references and never silently removes external installs.
- Closing the UI during an operation does not spawn another operation; reopening shows current progress or the final receipt.

## Verification

### Shared contract tests

Tavernary and Companion run identical fixtures for schema validation, search grammar, filters, sorting, Kit selection, and canonical IDs. Tavernary proves that its website input and public Pages catalog are the same generated bytes.

### Unit tests

- Conditional refresh, ETag, offline cache, corruption rejection, and schema mismatch.
- Install-contract validation and credential-bearing URL rejection.
- Managed versus external ownership.
- Kit reference counting, planning, staged activation, shared preservation, and partial failure.
- Self-protection through UI, imports, planners, and direct service calls.
- Exact trust, material/high concern, and stale-assessment warning selection.

### Host integration tests

A simulated adapter verifies standard SillyTavern request contracts without touching user extensions. A harmless fixture extension exercises installation, enable/disable, and removal in an isolated SillyTavern profile.

### Responsive and accessibility tests

Browser tests cover wide desktop, 1440x960, 1366x768, 1024x768, 800x600, 412px mobile, and 390px mobile. They measure actual geometry, clipping, filter transitions, card actions, detail navigation, scroll/focus restoration, keyboard behavior, touch targets, mobile Back, accessible names, contrast, and reduced motion. Performance uses the full current catalog.

### Live acceptance

- Verify the exact Tavernary deployment SHA serves `catalog/tavernary-catalog.json` with valid JSON, expected schema, correct MIME type, permissive CORS, and working ETag behavior.
- Compare representative searches, filters, sorts, and Kit results between Tavernary and Companion.
- Install the exact Companion release artifact into an isolated SillyTavern profile.
- Exercise individual lifecycle actions, successful and failed Kit activation, shared-member uninstall, offline refresh, schema mismatch, risk warnings, self-protection, and mobile/desktop interaction.
- Hash-check installed Companion production files against the release artifact and confirm no unexpected console errors.

## Acceptance criteria

V1 is complete when:

1. Tavernary's website and Companion consume the same living public catalog.
2. Companion reproduces Tavernary search, filters, sorting, and Kit selection through shared core behavior.
3. Only eligible SillyTavern extensions expose lifecycle actions.
4. External extensions remain untouched by Kit operations.
5. Personal Kits persist per profile and round-trip through portable JSON.
6. Kit activation protects the previous active Kit on partial failure and reloads at most once.
7. Approved trust and TavernKeeper warnings appear under the correct conditions.
8. Companion cannot manage itself or appear in personal Kits.
9. Unsupported schemas preserve a browse-only compatible cache and require a Companion update.
10. Desktop and mobile acceptance passes at the specified viewports with keyboard, focus, motion, and contrast requirements satisfied.
11. Exact Pages deployment and installed-artifact parity are proven.
