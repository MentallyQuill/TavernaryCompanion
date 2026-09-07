# Updating extensions

**Update All** appears beside **Check again** on Installed. It installs the latest available creator version for extensions with an available update, using the existing trust prompts. Updates run one at a time. The batch stops when an update fails or is cancelled; resolve or dismiss that notification, then use Update All for the remaining updates.

When an update fails and Companion confirms the installed version has not changed, it offers:

> **Directive couldn’t update.**
> Do you want to force-update? This will remove its current files and reinstall the version you selected.
> **Cancel** · **Replace and update**

The extension name changes to match the failed update. SillyTavern does not reliably report the cause of an update failure, so Companion does not claim that local changes caused it. Replacement is optional and only starts when you select **Replace and update**.

Replacement deletes the extension folder through SillyTavern, then reinstalls the selected version. No backup is made. Files saved inside that folder are removed too. Companion preserves the enabled/disabled setting and verifies the installed revision before reporting success. If installation fails after removal, **Retry installation** retries the installation without removing anything again. Keep Companion open while resolving a failed replacement; reopening requires checking the installed state again.

Install or update Tavernary Companion through SillyTavern's normal extension workflow and reload the browser when prompted. No separate helper, server configuration changes, or server restart is required. Exact-version replacements require the host's pinned-install capability; Companion checks that before removing anything. Native-only hosts reinstall the latest version from the selected repository and branch.
