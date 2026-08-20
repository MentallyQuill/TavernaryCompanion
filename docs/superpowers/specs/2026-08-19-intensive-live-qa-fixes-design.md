# Intensive Live QA Fixes Design

## Goal

Fix every Tavernary Companion-owned defect confirmed by the 2026-08-19 fresh-profile Playwright run: profile writes that survive reload and browser close, Kit operations that cannot reload before their final state is recorded, unambiguous uninstall reviews, readable long receipts, and bounded compatibility probes on legacy SillyTavern hosts.

The SillyTavern `/api/extensions/delete` HTTP 500 and invalid new-user `pattern` attribute are host defects outside this repository. Companion must continue to report ambiguous removal safely, but this change does not claim to repair those host implementations.

## Selected architecture

Three persistence approaches were considered:

1. Delay Kit reload with a timer. This depends on SillyTavern's current debounce duration and still loses direct-install state when the browser closes.
2. Move only the Kit reload after the existing store calls. This preserves more Kit receipts but leaves `ProfileStore.update()` falsely claiming persistence when the debounced callback has only been scheduled.
3. Make the profile-store dependency a completion-aware settings save and move reload ownership out of `KitExecutor`. This fixes both the Kit and direct lifecycle races at their source. **This is the selected approach.**

SillyTavern exports an immediate `saveSettings()` function from `/script.js`. The runtime resolves that module once and injects its function into `ProfileStore`. The store keeps its existing serialized queue and rollback behavior, but an update resolves only after the immediate settings request finishes. Test contexts may inject the same contract directly.

## Durable profile state

`ProfileStoreDependencies` will expose `saveSettings(): void | Promise<void>` rather than `saveSettingsDebounced()`. Every state transition continues to clone, migrate, queue, and publish as before. The state is copied into `extensionSettings`, the immediate save is awaited, and subscribers are notified only after completion. A rejected dependency restores the previous host value and leaves in-memory state unchanged.

The production bootstrap gets the saver from an optional runtime-context override or a cached dynamic import of `/script.js`. The override keeps tests and non-browser harnesses deterministic. Missing or malformed immediate-save support is a bootstrap failure rather than a silent return to non-durable behavior.

This boundary applies equally to individual installs, removals, Kit definitions, journals, receipts, ownership, trust acknowledgement, and update provenance.

## Kit transaction and reload ownership

`KitExecutor` remains responsible for mutation, verification, state reconciliation, receipt creation, receipt persistence, and journal cleanup. It will no longer call `host.reload()` from any success, partial, or failure branch.

`KitReceipt` gains `reloadRequired: boolean`, calculated from actual successful host changes rather than merely from the preflight plan. The executor must:

1. durably write the initial journal before the first host mutation;
2. durably record ownership and progress after each verified mutation;
3. build and durably persist the final receipt;
4. durably clear the journal; and
5. return the receipt without navigating.

The Kit operation tray shows **Reload now** whenever a returned receipt reports host changes. This matches the existing extension-update workflow, allows the result to be read, and makes reload an explicit post-commit action. Retry remains available for retryable project failures.

Recovery receipts do not request another reload: they describe state observed after an already-interrupted page lifetime.

## Uninstall plan clarity

Kit preflight categories are mutually exclusive for a given operation. During uninstall, a managed member appears under exactly one outcome group:

- **Remove** when the selected Kit owns the final installed reference;
- **Kept for other Kits** when another installed Kit still references it; or
- external/context-only when Companion does not own it.

`alreadyManaged` remains useful for install and activation review but is not populated for uninstall. A planner regression test asserts that destructive and informational outcome sets do not overlap.

## Receipt layout

Receipt project rows use a bounded grid rather than a single `space-between` flex line. Project ID and message columns receive `min-inline-size: 0` and `overflow-wrap: anywhere`; the action/status label remains readable without forcing the row beyond its container. Narrow containers collapse to a single-column reading order.

Browser tests exercise deliberately long IDs and messages at desktop and 390-pixel mobile widths, assert no horizontal overflow or clipping, and retain the visual hierarchy and accessible DOM order.

## Legacy compatibility probes

Capability discovery is session-scoped evidence and will be cached in the host adapter. Concurrent or repeated `getInstallCapabilities()` calls share one promise and one response.

Safe-update support begins unknown. The first `inspectUpdate()` request is the sole support probe. Concurrent callers wait for that result; a 404 marks the endpoint unsupported for the adapter lifetime and every later check fails locally with the existing safe message. A successful first inspection marks it supported and later projects perform their own inspections normally. This bounds legacy console noise to one request per unsupported contract instead of one per card or lifecycle step.

Transient network and non-404 server failures are not cached as unsupported, so Retry remains meaningful.

## Testing and proof

All behavior changes use red-green-refactor:

- profile-store tests hold an immediate-save promise and prove state does not publish early;
- bootstrap/runtime tests prove the immediate saver is resolved and missing support fails closed;
- Kit executor tests prove `reload()` is never called internally and receipt persistence plus journal clearing finish before resolution;
- planner tests prove uninstall groups are exclusive;
- host-contract tests prove concurrent capability and update-support probes collapse to one request while transient failures retry;
- component and Playwright tests prove the reload control and responsive receipt geometry.

After focused tests, run `npm.cmd run check`, the complete Playwright suite, release verification, and a new SillyTavern user/profile loop covering search, newest/scanned choices, individual install/uninstall, Kit creation/install/activate/deactivate/uninstall, reload, close-and-reopen persistence, offline fallback, and responsive views. Checked-commit execution remains correctly unavailable when the live host does not advertise pinned support.

## Integration

Implementation starts from current `origin/main` in an isolated worktree. The final branch is reviewed, committed, pushed directly to `main` as authorized, and checked against GitHub plus the deployed/installed artifact where applicable. The existing dirty primary checkout and its untracked files remain untouched.

