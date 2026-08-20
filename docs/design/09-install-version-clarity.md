# Install Version Clarity

## Goal

Choosing an extension version should be understandable at a glance, including for younger players. Companion should gently distinguish the version TavernKeeper assessed from newer creator changes without presenting a scan as a guarantee or making the flow feel dangerous.

## Version language

Companion uses the same plain-language terms in individual installs, updates, and Kits:

- **Latest scanned** is the newest version for which TavernKeeper has a report.
- **Latest from creator** is the newest version published by the project creator.
- When those versions differ, the scanned option says it is older than latest and the creator option says its newer changes have not been scanned yet.

The TavernKeeper status icon appears beside **Latest scanned**. Hover and keyboard focus open its result panel on pointer-based interfaces; click or tap toggles the same panel everywhere. The status is communicated by label and explanation as well as color.

## Install journeys

- If TavernKeeper scanned the exact latest revision, the existing direct install flow remains direct.
- If **Latest scanned** and **Latest from creator** differ and the host can install both exact commits, Companion asks the player to choose between two clearly described options.
- If the host exposes only its normal creator-latest install path, Companion starts that install directly without showing a disabled choice or an awareness popup.
- Existing material-concern and immediate-danger confirmations remain authoritative and occur after the version choice.

## Scan result language

A stale result distinguishes two situations:

- Same revision, older assessment policy: “This version was scanned, but the assessment is due for refresh.”
- Different scanned and current revisions: “The creator has published changes since this scan.”

The general disclosure uses concise, age-accessible language:

> These extensions are made by third parties. Tavernary lists them but does not control them. TavernKeeper checks one version and may miss problems. Review a project before installing it.

## Interaction and accessibility

- Explanatory text is at least 12px.
- Version choices have distinct buttons and do not nest the scan-control button inside another button.
- The scan panel remains open and interactive without dismissing the parent chooser.
- Focus returns to the invoking control when a chooser closes.
- Escape, backdrop click, and **Cancel** dismiss without installing.
- Mobile dialogs stay centered, blurred against the underlying page, and support tap-to-open scan details.

## Acceptance

- A player can identify the scanned option, the creator-latest option, and which is newer without opening extra documentation.
- Desktop hover/focus/click and mobile tap expose the TavernKeeper panel from **Latest scanned**.
- Installing a newest-only target does not add a version popup when no alternative can be executed.
- Installed-behind-scanned-and-latest fixtures expose both update choices and correctly bind their revisions.
- Individual installs, updates, and Kit version choices use the same vocabulary.
