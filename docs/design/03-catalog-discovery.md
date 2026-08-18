# Catalog Discovery

## Goal

Catalog discovery should preserve Tavernary's expressive search and comparison behavior while fitting inside a smaller, action-oriented shell. Users should be able to begin with relevant SillyTavern content, deliberately broaden their search, understand why a result is or is not actionable, and return from details without losing their place.

## Default experience

Projects opens with these active defaults:

- Frontend: **SillyTavern**
- Kinds: **Extension** and **Preset**
- Search: empty
- Sort: Tavernary's default browse sort

The defaults are visible as selected controls and removable chips. They are not hidden query magic. A short first-use hint says: “Showing SillyTavern extensions and presets. Clear filters to explore all Tavernary projects.”

Users may uncheck SillyTavern, select other frontends, include other kinds, or clear all defaults. Companion continues to render those projects completely. Their primary action becomes **View project** unless they are eligible SillyTavern extensions.

## Search

Search behavior comes directly from CatalogCore, including Tavernary's field weighting, normalization, evidence, AND behavior within clauses, and `+` union behavior between clauses. Companion does not implement a reduced grammar.

The search field:

- Begins searching without a submit step after a short debounce.
- Preserves the user's literal input while CatalogCore owns normalization.
- Offers the same concise search-help explanation as Tavernary.
- Announces result-count changes without moving keyboard focus.
- Keeps search text when switching between list and detail.
- Uses relevance sort automatically when Tavernary's shared transition rules require it, then restores the remembered browse sort when search clears.

Empty input means browse, not “all fields match.” Invalid or unsupported syntax is treated exactly as CatalogCore defines and explained through shared search help.

## Filters and sorting

Companion exposes every catalog filter and sort supported by the shared query contract. It does not maintain a separately named subset. Project filters include the current Tavernary category/function, frontend, kind, tag, license, activity/freshness, and related query dimensions. Kit filters use Tavernary's current frontend, purpose, model-family, included-project, project-count, and component-availability dimensions.

Desktop filters live in a persistent rail when space permits. Standard and mobile layouts use a sheet with:

- Current selection count per group.
- Available result count where Tavernary already calculates it.
- Apply/Close behavior that does not discard changes accidentally.
- **Clear group** and **Reset all** actions.

Active filters appear as removable chips outside the sheet. Removing a chip is immediate and returns focus to the nearest stable control.

Sort is always visible or one tap away. Labels match Tavernary. Companion does not reinterpret popularity, activity, sustained development, date added, alphabetical order, or relevance.

## Result workspace

The result header contains:

- Human-readable result count.
- Current sort.
- Filter control or rail relationship.
- Compact loading indicator during background index work.
- A route-specific empty-state message when no results remain.

Changing search or filters updates results without returning the user to the shell's top unless the current scroll position would show an empty region. A deliberate query change that substantially changes the result set returns the result container to its beginning while preserving the outer shell position.

## Project cards

Every card presents information in a predictable order:

1. Project name and kind.
2. Compact summary.
3. Frontend and key category/tag context.
4. Neutral activity/freshness evidence.
5. TavernKeeper assessment and freshness.
6. Installed/managed state.
7. One primary action.

The action is one of:

- **Install** — eligible and not installed.
- **Uninstall** — installed and removable through an explicit individual action.
- **Current extension** — Tavernary Companion itself; not actionable.
- **View project** — preset, frontend, non-SillyTavern extension, unavailable project, or missing/invalid install contract.

Cards do not say “unsupported” merely because a project belongs to another frontend. They say why no local action exists: “Browse-only in Companion,” “Preset installation is not available in V1,” or “Install contract unavailable.”

## Project details

Selecting a card opens a desktop drawer or mobile nested view. Details include:

- Full description and authorship/source links.
- Project kind, frontends, categories, tags, and license.
- Activity evidence and update context.
- TavernKeeper assessment summary, freshness, counts, scanned commit, history, and review link.
- Installation eligibility and installed/managed ownership.
- The same primary action as the card.

The detail view never becomes a second search page. Relationships, forks, and related evidence may link to another project detail while preserving a Back stack.

## Installed route

Installed is an inventory projection, not a filtered copy of cached button state. On entry and after operations, HostExtensionAdapter discovers current extensions and reconciles them with catalog identities.

Sections are:

- **Managed by Companion**
- **Installed outside Companion**
- **Not found in current catalog**

An externally installed project can still be inspected and explicitly uninstalled, but Kit plans label it external and never change it. Unknown installed extensions link to SillyTavern management rather than receiving guessed catalog identities.

## Empty, loading, and stale states

- Initial load with no cache uses a compact skeleton that preserves the final layout shape.
- Background refresh leaves current results interactive and shows freshness in the header.
- No results explains which active filters caused the empty set and offers **Clear filters**.
- Offline cache is visibly dated but fully searchable when schema-compatible.
- Incompatible cache is browse-only, with lifecycle actions replaced by the required update message.

## Approach

CatalogCore creates the same indices and selectors Tavernary uses. Companion stores route-local query state and translates selector output into compact view models. Eligibility and installed ownership are joined after catalog selection, so host state cannot change search ranking or catalog truth.

Result rendering uses measured responsive columns and bounded card content. Performance acceptance uses the full living catalog; virtualization is introduced only if real rendering measurements require it and must preserve keyboard navigation, card measurement, and scroll restoration.

## Discovery acceptance

- The default view clearly shows SillyTavern extensions and presets.
- Clearing defaults reveals other frontends without losing full cards or details.
- Representative searches, filters, and sorts match Tavernary exactly.
- Every card explains its actionability without implying quality or safety.
- Detail Back restores query, card focus, and result scroll.
- Installed state is refreshed from SillyTavern after lifecycle changes rather than assumed.
