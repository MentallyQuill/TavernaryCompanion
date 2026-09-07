# Updating extensions

**Update All** appears beside **Check again** on Installed. It installs the latest available creator version for extensions with an available update, using the existing trust prompts. Updates run one at a time. The batch stops when an update fails or is cancelled; resolve or dismiss that notification, then use Update All for the remaining updates.

When local file changes are confirmed to conflict with an incoming update, Companion shows:

> **Directive couldn’t update because some of its local files have been changed.**
> Do you want to force-update? This will remove its current files and reinstall the version you selected.
> **Cancel** · **Replace and update**

The extension name changes to match the failed update. Replacement deletes the extension folder through SillyTavern, then reinstalls the selected version. No backup is made. Files saved inside that folder are removed too. Companion preserves the enabled/disabled setting and verifies the installed revision before reporting success. If installation fails after removal, **Retry installation** retries the installation without removing anything again. Keep Companion open while resolving a failed replacement; reopening requires checking the installed state again.

## Host setup for local-change detection

Stock SillyTavern returns a generic server error for failed Git updates, so the browser extension alone cannot identify this cause. Install the bundled read-only helper on the computer running SillyTavern:

1. Copy `server/local-changes.mjs` from this repository to SillyTavern's `plugins` directory as `tavernary-companion.mjs`.
2. Enable `enableServerPlugins: true` in SillyTavern's `config.yaml` and restart SillyTavern.

The helper has no dependencies beyond Node and Git. It only inspects the authenticated user's local extension directory; it does not update, delete, back up, or fetch files. It checks whether changed or added files overlap the incoming revision, and fingerprints the evidence for confirmation. Replacement uses SillyTavern's existing extension endpoints.

Without this helper, Companion retains the ordinary update failure notification and does not claim that local changes caused it. Exact-version replacements require the host's pinned-install capability; Companion checks that before removing anything. Native-only hosts reinstall the latest version from the selected repository and branch.
