# Tavernary Companion

Tavernary Companion is a SillyTavern extension that helps you manage trusted extensions from the Tavernary catalog.

It is built for players, so your current SillyTavern setup stays in your control while Companion helps you stay organized.

## What this does

- Browse the Tavernary catalog from inside SillyTavern.
- Install and remove extensions that Companion manages.
- Check catalog-matched installed extensions for updates, use SillyTavern's native newest-version updater, and choose an exact scanned version when the host supports Companion's exact-update service.
- Save, switch, and track your extension sets with Kits.
- Preserve the ownership of manually installed or external extensions.
- Let you choose the TavernKeeper-checked version or the newest version when they differ.

## Start here

1. Open SillyTavern and open the Companion tab.
2. Pick a project in the catalog that looks useful.
3. Click Install. If Checked and Newest differ, pick the version you want.
4. Open your Kits view to switch between extension sets.

## Companion boundaries to know

- This is a **pre-alpha** feature. Some behaviors are still improving.
- In this release, Presets are browse-only.
- Not every catalog item is installable.
- Companion only Kit-manages or removes extensions it installed. Updating a catalog-matched external extension does not make it Companion-managed.
- Extensions in Companion are powerful; if a project was flagged, Companion warns you before install.

## Checks at a glance

TavernKeeper checks a specific project version. When the creator has published newer changes, Companion can show both that Checked version and the Newest version.

Companion does not switch between them by itself. If there is only one meaningful choice, it skips the extra question.

## If something feels wrong

- I cannot install or remove extensions I do not manage.
- If the catalog does not look fresh, your cached catalog may be used in browse-only mode.
- If an action is blocked, open the troubleshooting steps before retrying.

## Player docs

- [Read the player docs index](docs/user/README.md)
- [Getting started](docs/user/getting-started.md)
- [Browsing and installing](docs/user/browsing-and-installing.md)
- [Updating extensions](docs/user/updating-extensions.md)
- [Managing kits](docs/user/kits.md)
- [Checks and choices](docs/user/safety-and-trust.md)
- [Troubleshooting](docs/user/troubleshooting.md)
