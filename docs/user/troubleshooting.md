# Troubleshooting

Use this page when Companion does not behave as expected.

## Catalog does not load

- Check your internet connection first.
- Open/refresh the catalog.
- If the network is down, Companion can still use a last compatible cached catalog for browsing.

During cached mode, install actions may be limited.

## Install button is disabled

Check the project card reason text.

Common causes are:

- browse-only project,
- not in the managed install scope,
- active safety warning for this version.

If you are in cached-only mode, a safe full fetch may still be needed.

## Install completed, but nothing changed

Companion waits for SillyTavern to confirm installed state.

If nothing appears in your extension list, refresh SillyTavern and reopen the project.

If it still looks wrong, remove and retry the flow once.

## Project looked installed, then disappeared

This can happen if another process changed files outside Companion.

Use the refresh/discovery flow so Companion re-reads actual installed state.

## "Current/stale/high risk" warning appears too often

Risk warnings are a safeguard. You can continue only by confirming.

If this feels incorrect, open the project details and compare scan state with current install intent.

## I need help

Use the in-app app flow first:

- verify catalog refresh,
- read the exact warning text,
- then retry once.

If behavior remains wrong, include:

- your action steps,
- screenshot of the card reason,
- and the project link,

in your support report.
