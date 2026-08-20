# Installed Bulk Selection and Compact Kit Cards

**Status:** Approved for implementation on 2026-08-19.

## Goal

Turn the Installed route into a safe bulk-management surface without losing the useful Installed Kits panel. Installed Kits become compact group-selection controls. Users can select installed extensions individually or by Kit, then add the final selection to a new or existing personal Kit or uninstall it in one reviewed operation.

Kit membership describes a configuration. It never transfers lifecycle ownership.

## Product contract

- Keep an **Installed Kits** panel above the installed-extension sections.
- Replace the current full Kit cards with compact cards focused on selection.
- Add an explicit extension-selection mode and a sticky bulk-action bar.
- A Kit card selects its currently installed, individually actionable members.
- Selecting more Kits adds the union of their members and deduplicates overlaps.
- Users may refine the result by selecting or deselecting extension cards.
- Bulk actions operate on the final extension selection, never on how it was produced.
- **Add to Kit** can create a new personal Kit or add to an existing personal Kit through the Kit Builder.
- Adding to a Kit does not install, reinstall, update, enable, disable, adopt, or otherwise change ownership of any extension.
- Bulk uninstall uses one preflight and sequential verified removals. It does not promise rollback.
- Clearing the selection exits selection mode. There is no separate Done or Cancel-selection action.

## Non-goals

- Adopting externally installed extensions into Companion management.
- Editing published Kits.
- Reverse-matching arbitrary extension selections to every Kit they happen to satisfy.
- Replacing the full Kit route or Kit inspector.
- Bulk enable, disable, update, or install actions.
- Changing the existing meaning of active Kit authority.

## Installed Kits panel

The panel remains a distinct section above installed extensions, but its cards become compact. A card contains only:

- Kit name.
- Installed ratio, such as **4/5 installed**.
- Operational status: **Active**, **Partial**, **Drifted**, or **Missing** when applicable.
- Short visible attention microtext when needed, such as **Needs review** for Drifted.
- A compact overflow action for **View Kit**, **Restore missing**, or **Uninstall Kit**, depending on state.

Descriptions, origin labels, component-name lists, frontend labels, and catalog metadata remain in the Kit inspector rather than the Installed panel.

The panel includes visible guidance: **Choose a Kit to select its installed extensions.**

### Kit-card selection

Clicking a Kit card body:

1. Enters selection mode.
2. Adds every currently installed, selectable member to the extension selection.
3. Highlights the selected extension cards in their normal sections below.
4. Marks the clicked Kit card as an explicit selection source.
5. Opens the bulk-action bar.

Clicking another Kit adds its installed members to the existing selection. Shared projects appear once.

Explicit Kit-source highlighting is not inferred from arbitrary extension choices. If the user deselects a member required by an explicitly selected Kit, that Kit loses its source highlight. Clicking it again restores its currently installed selectable members. This avoids claiming the Kit remains wholly selected after the user refines the selection while also avoiding reverse-highlighting unrelated Kits.

A Partial Kit selects only installed members. Missing members are communicated by the ratio and status but cannot be selected. A Missing Kit with zero installed members remains visible as persistent intent, but its selection body is disabled; its restore and inspect actions remain available.

## Extension selection mode

The normal Installed toolbar exposes **Select**. Selection mode adds visible selection controls and selected styling to eligible installed-extension cards.

Eligible cards are catalog-matched installed extensions that Companion can address individually, whether Companion-managed or externally installed. Companion itself, uncataloged installations, and missing management records are not selectable. Their existing management or recovery affordances remain unchanged.

The sticky bulk bar contains:

- **N selected**
- **Add to Kit**
- **Uninstall**
- **Clear**

**Clear** empties the selection and exits selection mode. Escape and closing Companion do the same. A successful completed bulk action also clears and exits.

Selection is session UI state and is never persisted. It is reconciled against inventory refreshes so removed or no-longer-actionable projects cannot remain selected.

## Add to Kit

**Add to Kit** opens a compact target chooser:

- **New Kit**
- Each editable personal Kit

Published Kits are omitted because they are read-only.

Choosing **New Kit** opens the Kit Builder with the selected canonical project IDs prefilled. Choosing a personal Kit opens its Kit Builder with the selected IDs staged as additions. Existing members are deduplicated and normal Kit validation still applies.

The Builder remains the commit boundary. Nothing changes until the user saves. Canceling or closing the Builder returns to Installed with the extension selection preserved. A successful save clears the selection and exits selection mode.

Externally installed selections enter the definition as external members. They remain outside Companion lifecycle ownership. The target chooser and Builder review state explicitly say that ownership does not change.

## Bulk uninstall

Bulk uninstall is a new reviewed operation over selected extensions, not an implicit **Uninstall Kit** action.

Preflight groups the final selection into:

- Companion-managed extensions that can be removed.
- Externally installed extensions explicitly selected for direct removal.
- Kit impacts, including Kits that will become Partial or Missing.
- Active-Kit impact and resulting drift.
- Items whose current state changed and must be skipped or re-reviewed.

The confirmation names the extension count and affected Kits. Destructive consequences must be visible in the dialog and cannot exist only in tooltips.

After confirmation, removals execute sequentially through the existing lifecycle authority. Each removal is rediscovered and verified before Companion records ownership or Kit-state changes. Independent failures do not roll back verified removals.

On full success, selection mode exits. On partial failure, removed cards disappear, failed surviving cards remain selected, and the receipt names successes, failures, Kit consequences, and retryable items. Inventory refresh invalidates stale preflight data before any mutation.

## Kit persistence and fulfillment

A Kit definition persists independently of installed fulfillment:

- **Complete**: all eligible members are installed.
- **Partial**: some eligible members are installed.
- **Missing**: no eligible members are installed.
- **Drifted**: installed or enabled state differs from the Kit's last verified expectation.
- **Active**: the Kit currently defines Companion's desired managed enabled set.

Individually or bulk-uninstalling Kit children changes fulfillment; it does not delete the Kit definition or silently clear the installed association. Explicit **Uninstall Kit** remains the operation that stops treating the Kit as installed while applying existing reference-safe behavior. Shared members required by other installed Kits remain protected during explicit Kit uninstall.

## Tooltip and microcopy contract

Essential meaning remains visible because the current Tooltip component intentionally suppresses hover tooltips at mobile widths. Desktop tooltips open on pointer hover and keyboard focus, close on Escape, and render inside the owning Companion overlay. Touch users receive visible microtext or a tap-accessible help surface.

### Kit statuses

| Status | Visible text | Tooltip or help text |
| --- | --- | --- |
| Active | `4/4 installed · Active` | This Kit currently defines the enabled state for Companion-managed extensions. |
| Partial | `3/5 installed · Partial` | Some extensions in this Kit are not currently installed. |
| Drifted | `4/4 installed · Drifted` and `Needs review` | Installed or enabled extensions no longer match this Kit's last verified state. |
| Missing | `0/5 installed · Missing` | None of this Kit's extensions are currently installed. |

The Installed Kits heading includes a **Kit status help** control that makes all definitions available on touch and keyboard.

### Controls and inventory states

| Surface | Tooltip or explanation |
| --- | --- |
| Select | Select installed extensions for bulk actions. |
| Compact Kit card | Select the currently installed extensions in this Kit. |
| Add to Kit | Create a new Kit or add these extensions to a personal Kit. Ownership does not change. |
| Uninstall | Review and uninstall the selected extensions. |
| Clear | Clear the selection and exit selection mode. |
| Kit overflow | More actions for `<Kit name>`. |
| Partial ratio | `<N>` Kit members are not currently installed. |
| Companion managed | Companion can update and uninstall this extension. |
| Installed outside Companion | This extension remains outside Companion's Kit lifecycle control. |
| Uncataloged | Companion could not match this installation to a Tavernary project. |
| No longer installed | Companion has a previous management record, but the extension was not found. |

Selected indicators do not need redundant tooltips; their visible state and accessible checked state are sufficient. Membership text lists Kit names visibly when space permits and exposes the full list as a tooltip only when truncated. **Needs attention** always shows the real reason visibly.

Icon-only controls retain accessible names in addition to tooltips. Color, hover, motion, or tooltip presence never carries essential state alone.

## Component and state boundaries

### Installed selection model

A dedicated Installed-route selection controller owns:

- Selection-mode state.
- Selected canonical project IDs.
- Explicit Kit selection-source IDs.
- Union and deduplication behavior.
- Reconciliation after inventory or Kit-state refresh.
- Clear-and-exit behavior.

It does not own inventory, Kit definitions, lifecycle authority, or persisted profile state.

### Installed presentation

The Installed route composes:

- Compact Installed Kit cards.
- Existing installed inventory sections.
- Selectable extension-card presentation.
- Sticky bulk-action bar.
- Target chooser and bulk-uninstall preflight surfaces.

Installed view models provide selection eligibility, ownership explanation, Kit membership, and current actionable identity. Presentation does not infer lifecycle authority from CSS state or Kit membership.

### Kit Builder handoff

A small handoff contract carries canonical selected project IDs and an optional target personal Kit ID into the existing Builder draft flow. The Builder performs deduplication, validation, and save. The Installed selection is cleared only after confirmed save.

### Bulk removal coordinator

A bulk coordinator prepares an immutable fingerprinted plan from current inventory, lifecycle policy, selected IDs, Kit references, and active Kit state. Execution rejects stale plans, serializes verified removals, updates Kit fulfillment from verified results, and returns one aggregate receipt.

## Accessibility and responsive behavior

- Kit-card bodies and extension selection controls are real buttons or checkbox-equivalent controls with accessible pressed/checked state.
- Nested status-help and overflow controls are separate hit targets and never trigger Kit selection.
- Keyboard users can enter selection mode, choose Kits or extensions, invoke bulk actions, and clear without pointer input.
- Focus moves to the bulk bar when selection begins only when that does not disrupt a direct pointer interaction; otherwise the selected control retains focus and the bar is announced.
- The selected count is a polite live region.
- Mobile cards retain at least 44-by-44-pixel interactive targets.
- The compact Kit panel may wrap or horizontally scroll according to available width, but names, ratios, and states remain readable at 390 pixels and 200% zoom.
- The sticky bulk bar stays within the Companion overlay, avoids host controls and safe-area insets, and does not obscure the final installed card.
- Reduced-motion mode removes nonessential selection transitions.

## Error and recovery behavior

- Inventory refresh removes stale selections and announces the adjustment.
- A Kit card with no selectable installed members cannot enter selection mode.
- If all selected items disappear, selection mode exits automatically.
- Add-to-Kit validation errors remain in the Builder and preserve the staged selection.
- Bulk-removal preflight failure performs no mutation.
- Closing a preflight performs no mutation and preserves the selection.
- Partial execution produces an aggregate receipt and keeps only retryable surviving items selected.
- Persisted Kit fulfillment changes only from verified host results.
- Reload requirements are aggregated so a bulk operation reloads at most once through the existing lifecycle contract.

## Verification

Unit coverage must prove:

- Selection entry, union, overlap deduplication, refinement, clear, and inventory reconciliation.
- Explicit Kit-source highlighting without reverse inference.
- Complete, Partial, Drifted, and Missing card presentation and help copy.
- Selection eligibility across managed, external, uncataloged, missing, and self-protected entries.
- New and existing personal Kit handoff, deduplication, save/cancel behavior, and unchanged ownership.
- Fingerprinted bulk-removal planning, stale-plan rejection, sequential execution, Kit impact, active-Kit drift, and partial receipts.

Browser coverage must prove desktop, 390-pixel mobile, 200% zoom, keyboard operation, tooltip overlay ownership, touch-accessible status help, sticky-bar geometry, overlap selection, Add-to-Kit handoff, confirmation, and partial-failure recovery.

Full type, lint, unit, integration, build, release-package, and relevant live-host gates run before publication. Generated `dist` artifacts must match reviewed source. GitHub `main` and its required workflows must be green before completion is reported.
