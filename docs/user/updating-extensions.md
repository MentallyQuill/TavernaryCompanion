# Updating and removing extensions

Use **Installed** when you want to know what is present in this SillyTavern profile.

![Installed view on a phone, showing Check again, Installed Kits, and a managed extension](../../tests/e2e/responsive-conformance.spec.ts-snapshots/installed-390x844.png)

*Installed tells you what Companion can see right now. It also shows whether an extension is managed by Companion or installed outside it.*

## Check for updates

1. Open **Installed**.
2. Choose **Check again**.
3. Wait for Companion to check the catalog-matched extensions.

Each extension gets one of these results:

| Result | What it means |
| --- | --- |
| **Update available** | A newer version can be installed. |
| **Up to date** | Companion did not find a newer version for this extension. |
| **Could not check** | The check failed. Choose **Retry** after reading the reason. |
| **Needs attention** | Companion found a local or repository problem. Use SillyTavern's extension manager to inspect it. |

Standard SillyTavern releases can update an extension to the newest creator version. A compatible host can also offer a specific TavernKeeper-scanned version.

## Turn an extension on or off

Some installed cards have an **Enabled** or **Disabled** switch. Use it when you want to turn that extension on or off in SillyTavern without installing or removing it. The switch changes the host's enabled state and does not change the extension's files or Kit definition.

## Choose an update

Choose **Update** on the extension. Companion shows the versions that are actually forward from the version you have:

- **Latest scanned version** is the newest forward version TavernKeeper has scanned.
- **Newest version** is the latest version from the creator. It may contain changes TavernKeeper has not scanned.

On a standard SillyTavern host, only **Newest version** may be available because that host does not accept a specific commit. Companion still checks that the installed extension changed before it reports success.

If the latest scanned version is already installed, Companion does not ask you to install it again. It offers only a newer creator version, if one exists.

The choice is tied to the installed state Companion just checked. If the catalog or the extension changes before the update begins, Companion stops and asks you to check again.

## What Companion will not overwrite

Companion will not update an extension when:

- the repository does not match the catalog;
- the branch or history is different;
- local changes are present;
- the action would roll back, downgrade, reset, stash, or force a change.

A catalog-matched extension installed outside Companion can sometimes be updated. It remains externally owned. Adding it to a Kit also leaves the ownership unchanged.

When the problem is local or repository-related, use SillyTavern's extension manager. Companion will not take over work that belongs to another installation path.

If an Installed entry says the extension is missing, **Forget record** removes Companion's old record of it. It does not delete files, and it does not remove the saved Kit that once included it.

## Finish an update

After SillyTavern applies the update, Companion reads the installed state again and verifies the result. A successful update leaves **Reload to apply updates** visible for this Companion session.

You can update more than one extension first, then choose **Reload now** once.

There is no bulk update, background update polling, saved update cache, or Companion self-update control in V1.

## Remove several extensions at once

1. Open **Installed** and choose **Select**.
2. Select individual extensions, or choose an Installed Kit to select its current members.
3. Choose **Uninstall** in the action bar.
4. Read the ownership and Kit impact summary.
5. Confirm the list.

Companion removes the extensions one at a time and verifies each result. A receipt lists every success and failure.

![A completed operation notification says the result was verified in SillyTavern](../../tests/e2e/operation-notification.spec.ts-snapshots/operation-notification-panel-390x844.png)

*A receipt is a record of what happened. If only part of a batch worked, the failed items remain selected for **Retry failed**.*

Bulk uninstall changes which Kit members are present. It does not delete the Kit definition. An affected Kit can become **Partial**, **Missing**, or **Drifted**.
