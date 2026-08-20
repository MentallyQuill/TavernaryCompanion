# Tavernary Companion Player Documentation Design

**Date:** 2026-08-20

**Status:** Approved in conversation; written-spec review pending

## Goal

Make Tavernary Companion's public player documentation complete, friendly, and easy to follow for a young player. The documentation should explain every player-facing feature in the current pre-alpha surface and use screenshots to show the main workflow.

## Audience and scope

The audience is a player who may be new to SillyTavern, Git-style extension management, and the words used by Companion. Copy should use short sentences, familiar words, and concrete actions.

The public scope is limited to:

- `README.md`
- `docs/user/README.md`
- `docs/user/getting-started.md`
- `docs/user/browsing-and-installing.md`
- `docs/user/updating-extensions.md`
- `docs/user/kits.md`
- `docs/user/safety-and-trust.md`
- `docs/user/troubleshooting.md`
- new `docs/user/words-to-know.md`

The internal design and implementation documentation remains unchanged.

## Product model to teach

The docs use three simple “rooms” as the primary mental model:

1. **Projects** is where the player looks for extensions and reads about them.
2. **Kits** is where the player saves groups of extensions and switches between groups.
3. **Installed** is where the player sees what is present now, what Companion manages, and what can be updated or removed.

The docs must keep these states distinct:

- **Saved**: a Kit definition exists.
- **Installed**: the extension files are present.
- **Active**: a Kit is currently the selected managed setup.
- **Managed by Companion**: Companion installed and owns the lifecycle of that extension.
- **Installed outside Companion**: the extension is present but ownership stays with the player or SillyTavern.

## Content changes

### `README.md`

Rewrite the front page as a visual tour:

- one-sentence description and pre-alpha note;
- a hero Projects screenshot;
- a “Three places to go” section with Projects, Kits, and Installed screenshots;
- a short first-install workflow with numbered actions;
- screenshots and plain-language explanations for the safety notice and Checked/Newest choice;
- a Kit Builder and Installed workflow section;
- a concise “what Companion does not do” boundary section;
- links to the player docs and troubleshooting.

Use compact captions and short paragraphs. Prefer images and action names over long feature lists. Use relative image links to existing, tested E2E snapshots so the README does not need a second unverified screenshot set.

### `docs/user/README.md`

Turn the index into a task chooser with “I want to…” links. Explain the three-room model, list the complete player guide, and link to the glossary. Make it clear that the guide describes the current pre-alpha build.

### `docs/user/getting-started.md`

Cover opening Companion, waiting for or refreshing the catalog, recognizing the three routes, installing the first extension, reading the first-install disclosure, confirming an action, and reloading when SillyTavern needs to apply changes. Include the mobile Projects screenshot where it helps a new player identify the controls.

### `docs/user/browsing-and-installing.md`

Cover search, filters, sorting, project cards, details, install eligibility, Checked/Newest choices, warnings, Kit selection from Projects, single uninstall, bulk selection, bulk uninstall review, and the current browse-only status of presets. State why disabled actions appear and keep ownership rules visible.

### `docs/user/updating-extensions.md`

Cover the Installed route, Check again, enabled/disabled switches, update statuses, Retry, native newest updates, exact TavernKeeper-scanned updates when the host supports them, commit verification, Reload to apply updates, Forget record for missing entries, no bulk update in V1, and bulk uninstall with partial-failure receipts. Explain that updating an externally installed extension does not transfer ownership.

### `docs/user/kits.md`

Cover Personal and Published Kits, Kit search and filters, saved/installed/active states, Partial/Missing/Drifted status, creating and editing a Kit, Add to Kit from Projects or Installed, applying a Kit, shared extensions, import/export, and incomplete Kit warnings. Use the Kit Builder, Kit route, Installed Kit, and selection screenshots.

### `docs/user/safety-and-trust.md`

Explain that TavernKeeper checks are evidence about a specific version, not a guarantee. Cover the first-install unsandboxed-code disclosure, project warnings, Checked/Newest tradeoffs, ownership boundaries, local changes, and the player’s responsibility to review unfamiliar extensions. Use the safety and scan-result screenshots.

### `docs/user/troubleshooting.md`

Organize recovery by symptom: catalog loading, cached browse mode, disabled install, install verification, missing installed state, update status, local changes, safety warnings, Kit state, bulk-operation receipts, reload, and support reports. Each section should end with the smallest useful next action.

### `docs/user/words-to-know.md`

Add a short glossary using child-readable definitions for: catalog, project, extension, preset, Kit, Personal Kit, Published Kit, managed, external, installed, active, Checked version, Newest version, TavernKeeper, cached catalog, Partial, Missing, Drifted, and receipt.

## Screenshot map

Use the existing snapshots below. The README may use the wide versions for visual overview and the mobile versions to show that the same workflow works on a small screen.

| Lesson | Snapshot |
| --- | --- |
| Projects overview | `tests/e2e/responsive-conformance.spec.ts-snapshots/projects-1440x960.png` |
| Projects on a phone | `tests/e2e/responsive-conformance.spec.ts-snapshots/projects-390x844.png` |
| Checked vs Newest | `tests/e2e/install-version-choice.spec.ts-snapshots/checked-or-newest-1440x960.png` |
| First-install disclosure | `tests/e2e/responsive-conformance.spec.ts-snapshots/lifecycle-disclosure-390x844.png` |
| TavernKeeper scan result | `tests/e2e/responsive-conformance.spec.ts-snapshots/tavernkeeper-390x844.png` |
| Kit Builder | `tests/e2e/kit-switching.spec.ts-snapshots/kit-builder-desktop-1440x960.png` |
| Kits on a phone | `tests/e2e/responsive-conformance.spec.ts-snapshots/kits-390x844.png` |
| Installed on a phone | `tests/e2e/responsive-conformance.spec.ts-snapshots/installed-390x844.png` |
| Add to Kit selection | `tests/e2e/responsive-conformance.spec.ts-snapshots/kit-selection-390x844.png` |
| Completed operation | `tests/e2e/operation-notification.spec.ts-snapshots/operation-notification-panel-390x844.png` |

Each image needs useful alt text. Captions should say what the player should notice, not merely repeat the file name.

## Language and accuracy rules

- Use “you” and direct verbs: “Open Installed,” “Choose Checked version,” and “Read the warning.”
- Define a technical word the first time it appears.
- Say who knows what: Tavernary publishes catalog information, TavernKeeper checks a version, SillyTavern reports installed files, and Companion records local Kit and ownership state.
- Never call a project safe, approved, or guaranteed because it has a scan.
- Explain consequences before uninstalling, switching, or confirming a warning.
- Keep “what Companion will not do” near the relevant action.
- Do not invent features that are absent from the current build, including preset installation, bulk update, background update polling, or automatic ownership transfer.
- Keep the pre-alpha limitation visible without allowing it to overwhelm the task instructions.

## Verification

Before calling the documentation update complete:

- confirm every player-facing feature in the current UI is represented in one of the public docs;
- confirm every link in `README.md` and `docs/user/` resolves to a repository file;
- confirm every referenced screenshot exists and renders;
- search public docs for stale or misleading claims about ownership, safety, version choice, presets, updates, and Kits;
- run the repository's documentation-adjacent checks or the full test command if no narrower check exists;
- inspect the final diff and ensure only the approved public docs plus this spec changed.
