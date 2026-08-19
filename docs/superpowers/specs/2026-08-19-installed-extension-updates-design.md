# Installed Extension Updates Design

## Goal

Show trustworthy update availability on the Installed page and let a player update a catalog-matched extension to either the newest creator version or the latest forward TavernKeeper-scanned version. Keep version one page-scoped, explicit, and small: no background scheduler, persisted update cache, bulk update, rollback, or automatic reload.

The feature covers Companion-managed and externally installed local extensions when the installed Git origin matches the current catalog install contract. Updating an external extension does not adopt it into Companion management. Global, uncataloged, missing, origin-mismatched, dirty, detached, ahead, or diverged installations remain under SillyTavern management.

## Product behavior

Opening Installed checks eligible extensions with bounded concurrency. A **Check again** toolbar action repeats the check. Results live only for the current Companion session and are invalidated by catalog refresh, inventory change, or a completed update.

Each eligible card shows one state:

- **Checking...** while its repository is inspected.
- **Update available** when at least one proven forward target exists.
- **Up to date** when no forward target exists.
- **Could not check** with **Retry** when inspection fails.
- **Needs attention** when origin, worktree, branch, or history cannot be updated safely.

When an update exists, **Update** appears immediately left of **Uninstall**. A current card has no disabled Update button. Update never appears for Tavernary Companion itself.

Clicking Update always opens a compact confirmation. It shows only forward targets:

- **Latest scanned version**: the newest usable TavernKeeper report commit when it is a descendant of the installed commit and is not equal to it.
- **Newest version**: the current configured install-branch head when it is a descendant of the installed commit and is not equal to it.

If both labels resolve to the same commit, the confirmation shows one target and notes that TavernKeeper checked it. If the installed commit already equals the latest scanned commit, the confirmation says, "You already have the latest scanned version," and does not offer it. An older, ahead, or diverged scanned commit is not an update target. Rollback is a separate future feature.

The normal UI does not display hashes. Optional operation details may retain them.

## Selected architecture

Three approaches were considered:

1. Add live update state to inventory reconciliation. This couples a deterministic identity model to network I/O and makes ordinary catalog refresh fragile.
2. Persist update availability in profile state. This creates migration and staleness problems without improving version-one behavior.
3. Add a page-scoped update coordinator beside inventory reconciliation. This keeps discovery deterministic, isolates network and mutation policy, and allows individual failures. **This is the selected approach.**

An `ExtensionUpdateCoordinator` owns in-memory status by project ID, bounded checks, target preparation, stale-choice validation, and execution. The Installed view model projects coordinator state onto existing rows. The Installed route starts a check on entry, exposes Check again and per-card Retry, and renders the compact chooser.

The existing lifecycle operation lock serializes update against install, removal, Kit operations, and toggles. Target-aware TavernKeeper policy is reused: the chooser is neutral, Newest explains that it may include unchecked changes, and existing material/high-concern prompts still apply to the selected target.

## Host contract and compatibility

Update inspection must report:

- exact installed commit;
- exact configured-branch head;
- normalized Git origin and current branch;
- whether the worktree is clean and attached to the expected branch; and
- installed-to-target relationships: equal, behind, ahead, or diverged.

Exact scanned updates additionally require an advertised pinned-update capability. Execution binds the expected installed commit and requested target commit so a concurrent checkout change fails before mutation. The host must not force-reset, stash, discard, or merge local work. A pinned update either reaches the exact target or leaves the checkout unchanged.

Companion must not probe capability by sending fields to a legacy endpoint that may ignore them. On a standard host without the enhanced update capability, Companion may use SillyTavern's existing version/update contract for a clean, origin-matched, ordinary forward update to Newest. Latest scanned remains unavailable unless the host can both prove forward ancestry and update to the exact commit. If legacy state cannot establish the selected safety conditions, the card hands off to SillyTavern rather than guessing.

Repository URLs are compared through one conservative normalizer: HTTP(S) only, lowercase host, normalized path, and insignificant trailing `.git` or slash removed. Provider or repository identity changes never count as an update.

## Update flow

1. Re-read the current catalog project and installed extension identity.
2. Inspect repository status and verify the exact catalog origin.
3. Compute forward scanned and newest targets.
4. Bind the project, catalog generation, installed commit, origin, branch, and target commit into a prepared selection.
5. Open the compact confirmation, even when only one target exists.
6. Run target-aware TavernKeeper prompts for the selected commit.
7. Revalidate the binding under the lifecycle lock.
8. Ask the host to update without force, stash, or merge.
9. Rediscover the extension and verify exact identity and resulting commit.
10. Record a receipt, recheck that card, and show the reload reminder.

A successful update does not change managed/external ownership. Managed provenance is refreshed only to describe the newly verified update target; external installations remain external.

## Failures and recovery

Inspection failures affect only their card. Retry repeats that card's check. A catalog refresh or inventory change cancels or invalidates obsolete results.

Origin mismatch, dirty worktree, unexpected branch, detached head, ahead history, and divergence produce Needs attention and a SillyTavern handoff. Companion never offers force update, automatic stash, reset, or rollback.

If a prepared target becomes stale, Companion closes the operation without mutation and asks the player to check again. If execution returns but rediscovery or exact revision verification fails, Companion reports that the extension needs attention and does not claim success. Existing code remains responsible for preserving detailed sanitized diagnostics.

After success, a persistent **Reload to apply updates** notice offers **Reload now** while allowing additional updates first. The notice remains until reload or Companion closes.

## Accessibility and responsive behavior

The update status is text, not color-only. Update and Retry have project-specific accessible names. The chooser uses the existing overlay behavior: labelled heading, focus restoration, Escape and outside-click dismissal, touch targets, viewport repositioning, 200% text support, and reduced-motion compatibility.

The footer order is extension toggle, Update or Retry, then Uninstall. Narrow cards may wrap controls without changing their reading or tab order.

## Testing and proof

Unit tests cover URL matching, every commit relationship, target deduplication, already-scanned messaging, capability fallback, stale bindings, origin/dirty/diverged refusal, ownership preservation, and exact post-update verification.

UI tests cover automatic page-entry checks, Check again, independent card failure and Retry, control order, one- and two-target confirmations, keyboard dismissal, status announcements, and reload notice behavior.

Integration tests use temporary Git histories to prove forward-only selection, no mutation for dirty or diverged checkouts, exact pinned targets, stale-selection rejection, and unchanged external ownership. Full unit, integration, type, lint, build, browser, and release-package gates run before publication.

## Non-goals

- Rollback or downgrade.
- Bulk Update all.
- Background polling or notifications outside Installed.
- Persisted update availability.
- Automatic stash, reset, merge-conflict resolution, or force update.
- Adopting external extensions into Companion management.
- Updating global or uncataloged extensions.
- Updating Tavernary Companion itself.
