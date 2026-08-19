# Safety and trust

Companion is about help, not trust automation. You still make the final decision.

## Why warnings appear

Extensions run in SillyTavern directly, so dangerous projects can affect your local environment.

Warnings appear when:

- a project has a current risk finding,
- a finding is stale,
- or the scan result is high risk.

Warnings are not there to block you forever. They are there to make risk obvious before install.

## How to use Tavernary and TavernKeeper signals

Tavernary provides project metadata and scan status from its catalog flow. Companion surfaces these signals at install time.

If a warning is shown:

1. Read the full reason.
2. Recheck project notes.
3. Continue only if you choose to accept the risk.

## Managed ownership

Companion only manages what it has installed.

It does not:

- touch extensions that you installed by hand,
- edit your external extension folders,
- remove itself automatically.

## Current vs stale assessment

- Current warning: scan matches the project version in catalog.
- Stale warning: scan came from an older version.

Treat stale warnings as a reason to double-check project details before installing.

## External safety practice

Start with small, temporary test installs in a non-critical setup.

Uninstall anything that behaves unexpectedly.
