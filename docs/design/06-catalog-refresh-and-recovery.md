# Catalog Refresh and Recovery

## Goal

The catalog should feel current without making the user wait for Tavernary or fear that a refresh will break local state. Companion renders known-good data immediately, checks Tavernary quietly, explains freshness honestly, and treats schema changes as an application-update event rather than a parsing experiment.

## Catalog authority

Companion reads one living asset:

`https://tavernary.org/catalog/tavernary-catalog.json`

Tavernary's website consumes the same generated file. The stable filename does not include deployment or schema numbers. `generatedAt`, schema version, and HTTP ETag have separate responsibilities:

- `generatedAt`: when Tavernary generated the content.
- `schemaVersion`: which data contract the file follows.
- ETag: whether the bytes changed since Companion last checked.

## First load

### Compatible cache exists

1. Validate cache metadata and render it immediately.
2. Show its generated time and last-checked state.
3. Start a conditional background refresh when the previous successful check is older than the refresh throttle.
4. Keep search and browsing interactive during the request.

### No cache exists

1. Show the final shell with a compact catalog-loading skeleton.
2. Fetch the living asset.
3. Validate schema and full content before rendering.
4. If the request fails, offer **Retry** and **Open Tavernary** with a plain offline/error explanation.

The initial implementation uses a 15-minute successful-check throttle across repeated opens. Manual refresh bypasses the throttle. A shell left open rechecks after returning to focus when the prior successful check is older than one hour. These intervals limit noise while comfortably tracking Tavernary's several daily publications.

## Manual refresh

The header refresh control always remains available unless a lifecycle commit or another refresh is actively locking catalog mutation. Activating it:

- Preserves route, query, selected detail, and scroll.
- Shows compact progress beside freshness.
- Uses a conditional request.
- Announces whether the catalog changed.
- Re-runs current selectors when new data commits.

If nothing changed, the UI says **Catalog is current** without a toast storm. If results change, the result count updates and a quiet notice offers **Review changes** when the selected project, installed Kit, or active detail was affected.

## Atomic replacement

The response passes these gates before replacing cache:

1. HTTP success and expected JSON content type.
2. Parseable JSON object.
3. Recognizable top-level catalog identity.
4. Supported schema version.
5. Full schema validation through CatalogCore.
6. Required vocabularies and canonical IDs are internally consistent.

Only then does CatalogClient write a new cache record and switch the in-memory catalog. Cache writes use a new record followed by an active-pointer update so interruption cannot corrupt the previous valid cache.

## Freshness presentation

The header uses factual states:

- **Updated [relative time]** — current compatible catalog.
- **Checking Tavernary…** — background conditional request.
- **Catalog is current** — unchanged response.
- **Using cached catalog** — network check failed but compatible cache remains.
- **Refresh failed** — current data remains valid; details explain why.
- **Companion update required** — newer incompatible schema.

Catalog freshness is independent of TavernKeeper assessment freshness. A newly generated catalog may still report a stale assessment for a project, and the UI keeps both dates visible in their own contexts.

## Content changes while browsing

After a successful replacement:

- Search and filters remain unchanged and re-run against the new catalog.
- A selected project that still exists updates in place.
- A removed, withdrawn, or newly unavailable selected project becomes a retained unavailable detail with lifecycle actions disabled and a path back to results.
- Published Kit changes receive **Changed on Tavernary** state; installed membership does not mutate automatically.
- New assessment severity affects the next install warning immediately.
- Managed and installed state remains local and is reconciled separately.

Companion never treats catalog removal as permission to uninstall a local extension.

## Offline behavior

A compatible cache remains fully searchable and filterable offline. The UI displays its generated time and last successful check. Lifecycle actions remain available only while the cached schema is supported and the entry still has a valid install contract, but installation requiring network may fail at the host layer and is never represented as guaranteed offline functionality.

Users may deliberately continue browsing cache after a network failure. Companion does not repeatedly reopen blocking errors. Manual retry and normal throttled checks remain available.

## Unsupported schema

When the living file has schema 8 and the running Companion supports schema 7, CatalogClient records only mismatch metadata. It does not replace or partially interpret the compatible cache.

The blocking notice is:

> **Catalog update requires a newer Companion**
>
> Tavernary has published catalog schema 8. This version of Tavernary Companion supports schema 7. Update Tavernary Companion before refreshing the catalog.
>
> Your last compatible catalog remains available for browsing, but installation and Kit changes are paused.

Actions:

- **Update Companion** — hand off to SillyTavern's extension manager.
- **Use cached catalog** — enter browse-only mode.
- **Open Tavernary** — always available and emphasized when no cache exists.

Companion never offers **Sync schema**. A remote JSON Schema can validate shape but cannot update executable search, filter, Kit, or lifecycle assumptions.

## Companion update handoff

Companion does not rewrite itself. **Update Companion** opens or invokes SillyTavern's native management path. The notice remains until reload proves the running Companion supports the current schema. If the update path is unavailable, instructions identify the native extension manager and preserve **Open Tavernary**.

## Error detail

User-facing errors distinguish:

- Offline or DNS failure.
- HTTP failure.
- Cross-origin or content-type failure.
- Invalid JSON.
- Unsupported schema.
- Catalog validation failure.
- Cache write failure.

The primary message explains impact: whether current browsing remains valid and whether lifecycle actions are paused. Technical detail includes timestamps, status code, schema numbers, and a correlation ID where available, but not headers, credentials, or full payload dumps.

## Approach

CatalogClient separates transport, validation, and storage. CatalogCore owns schema recognition and full validation. IndexedDB stores public catalog cache and metadata; profile settings store only user preferences and last-check presentation state where necessary. The UI consumes a small catalog-status state machine rather than handling fetch promises directly.

## Refresh acceptance

- A compatible cache renders before the background network check finishes.
- Repeated opens within the throttle do not create request bursts.
- Manual refresh never resets route, query, detail, or scroll.
- Invalid data cannot replace a good cache.
- Published Kit/catalog changes never mutate local installations automatically.
- Unsupported schemas pause lifecycle actions and guide a native Companion update.
- Offline and stale assessment states remain distinct and understandable.
