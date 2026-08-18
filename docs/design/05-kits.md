# Kits

## Goal

Kits should make an extension setup feel like a named configuration the user can understand, carry, and switch—not a blind batch installer. A Kit has a definition, an installed state, and optionally an active state. Companion makes those states visible and changes them only after a reviewable plan succeeds.

## Core mental model

- **Saved** means the Kit definition exists.
- **Installed** means Companion has successfully installed and recorded its eligible managed members.
- **Active** means its managed members define Companion's desired enabled set.
- **Incomplete** means one or more required eligible members are absent or failed verification.

Saving does not install. Installing does not automatically make a Kit active unless the user chose **Activate Kit**. Only one Kit is active, but several may remain installed for fast switching.

## Kit sources

### Published Tavernary Kits

Published Kits come from the living catalog. They are read-only and display Tavernary authorship, component availability, support/activity context, and current project assessment states. Users may:

- Inspect components.
- Install or activate the published Kit.
- Copy it into a personal Kit.
- Open its Tavernary page.

Catalog refresh may update a published Kit definition. Companion compares the new definition with installed state and marks the Kit **Changed on Tavernary**; it never silently installs or removes members.

### Personal Kits

Personal Kits are profile-local and editable. Users may create, rename, duplicate, edit, import, export, remove, install, activate, deactivate, and uninstall them.

A new V1 personal Kit targets SillyTavern and begins with the SillyTavern frontend as a context component. The member picker emphasizes eligible SillyTavern extensions. Copied or imported Kits may preserve presets and other browse-only projects as context, clearly separated from actionable extensions.

### Imported Kits

Import validates the portable format version, canonical project IDs, local UUID collision, self-protection, duplicates, and basic text/ordering integrity before showing a preview. The user chooses **Import as new Kit**; Companion does not overwrite an existing Kit from an untrusted file.

Unknown or no-longer-published project IDs are preserved only when the format is valid and shown as unavailable context. Tavernary Companion's own project ID causes a specific rejection rather than silent removal.

## Kits route

The route opens with installed and active state visible before popularity or other secondary evidence. Sections or filters allow:

- Active
- Installed
- Personal
- Published
- Incomplete

Search and Tavernary Kit filters come from CatalogCore. Personal Kits participate through a local index with the same normalized title, description, component, frontend, purpose, and model-family concepts where data exists.

Each Kit card shows title, origin, component count, target frontend, installable count, unavailable/flagged count, installed/active state, and one primary action. Published Kit activity/support remains neutral and never replaces operational state.

## Kit inspector

The inspector groups components into:

1. **Managed/actionable extensions** — eligible SillyTavern extensions Companion installed or may install.
2. **External extensions** — present in SillyTavern but outside Companion management.
3. **Context-only projects** — frontend, presets, other frontend projects, or browse-only catalog entries.
4. **Unavailable projects** — missing, flagged, withdrawn, incompatible, or invalid-contract members.

Every component shows why it belongs to its group. The inspector includes the primary Kit action, edit/copy/export controls when applicable, and a plan preview.

## Creating and editing a personal Kit

### Create flow

1. Choose **New Kit**.
2. Enter title and optional description.
3. SillyTavern appears as the fixed target frontend context.
4. Add eligible extensions from search results or the installed inventory.
5. Reorder members for human meaning; lifecycle execution still uses dependency-safe phases rather than visual order.
6. Review context-only and unavailable members.
7. Save locally.

The editor may remain open while browsing Projects through an “Add to Kit” selection dock. Project selection never exposes Tavernary Companion itself. Unsaved changes survive internal navigation for the current session. Closing the overlay prompts Save, Discard, or Continue editing.

### Copy published Kit

Copy creates a new local UUID and records the published Kit ID as origin. The definition is a snapshot; later Tavernary changes do not rewrite the personal copy. The user may compare the copy with its current origin from the inspector.

## Install and activate

### Install Kit

**Install Kit** prepares missing eligible members without changing which Kit is active. Preflight lists:

- Extensions to install.
- Already installed managed members.
- External members that satisfy presence but remain untouched.
- Context-only members.
- Shared managed members.
- Unavailable required members.
- Material/high concern warnings.

If required eligible members are unavailable, installation cannot begin. Browse-only context does not block installation but remains visible as not installed by Companion.

### Activate Kit

**Activate Kit** uses the staged activation contract:

1. Plan and warn before mutation.
2. Install missing eligible members sequentially.
3. Rediscover and verify every required member.
4. Enable the requested managed set.
5. Disable managed members exclusive to the previously active Kit.
6. Commit active Kit identity.
7. Reload once if required.

External extensions remain in their current enabled state and appear in preflight as outside the exact managed profile. The summary therefore says “Managed Kit activated” rather than claiming every third-party extension now matches the Kit.

## Deactivate, uninstall, and remove

### Deactivate Kit

Deactivation disables the Kit's managed members that are not needed by another applicable active state, clears active identity, and leaves repositories installed. A Kit may remain installed and inactive.

### Uninstall Kit

Uninstall calculates reference counts across installed Kits. It removes only managed extensions no longer required by another installed Kit. Shared members remain and are listed under **Kept for other Kits**. External members are never removed.

If the Kit is active, uninstall includes deactivation in the same preflight. The installed Kit record changes only from verified per-project results. Partial deletion marks the Kit incomplete and preserves a retry plan.

### Remove Kit

Remove deletes a personal definition only. If it is installed or active, the dialog clearly offers:

- **Remove definition only**
- **Uninstall Kit first**
- **Cancel**

Published Kits cannot be removed from Tavernary; users may remove only local installed-state references or personal copies.

## Switching experience

The primary fast path is selecting an installed Kit and choosing **Activate**. A compact comparison summarizes:

- Already correct
- Will enable
- Will disable
- Must install
- External and unchanged
- Warnings requiring review

Progress remains in the operation tray if the overlay closes. After reload, Companion rediscovers installed/enabled state and confirms the active Kit. If host state diverges later, the Kit becomes **Drifted** rather than silently changing external or user-modified state.

## Partial failure

Installation attempts may continue for independent members so the final receipt is complete, but activation never crosses its commit point when any required eligible member is missing or unverifiable. The prior active Kit remains authoritative.

The receipt groups:

- Installed successfully
- Already present
- Failed
- Skipped
- External and unchanged
- Reload pending

Successful clones are not rolled back. A **Retry incomplete actions** button creates a fresh preflight using current catalog and host state.

## Import and export

Export writes a portable, human-inspectable JSON document containing format version, local identity, title, description, target frontend, ordered canonical project IDs, timestamps, and origin. It excludes host folders, tokens, operation receipts, enabled state, and management records.

Import preview explains unavailable IDs and format compatibility before saving. Future local-format versions use the same last-known-good rule as catalog schemas: unsupported files are rejected without altering saved Kits.

## Approach

KitStore owns definitions. ManagedExtensionRegistry owns lifecycle authority. KitPlanner joins definitions, installed Kits, references, host discovery, and catalog eligibility into an immutable plan. KitExecutor performs only that approved plan and persists verified outcomes. UI labels derive from those sources rather than a single overloaded `installed` flag.

## Kit acceptance

- Users can distinguish saved, installed, active, incomplete, and drifted states.
- Published Kits remain read-only and personal copies remain stable snapshots.
- External extensions are visible but untouched by every Kit operation.
- Shared managed extensions survive uninstall of one Kit.
- A failed activation leaves the previous Kit active and produces a retryable receipt.
- Portable JSON round-trips without machine-specific or sensitive data.
