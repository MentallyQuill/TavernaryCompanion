# Updating extensions

Open **Installed** to refresh the installed list and check catalog-matched local extensions for updates. Use **Check again** whenever you want a fresh check.

Exact checks and updates require a compatible SillyTavern host that exposes Companion's exact-update service. Standard SillyTavern releases do not currently expose that service. On those builds, Companion shows **Needs attention** and hands the extension back to SillyTavern's extension manager instead of falling back to an unverified update.

Each extension shows one compact result: **Update available**, **Up to date**, **Could not check**, or **Needs attention**. A failed check has its own **Retry** action.

## Choose the version

Choose **Update** immediately to the left of **Uninstall**. Companion always asks which available version to apply:

- **Latest scanned version** is the newest forward version TavernKeeper has scanned.
- **Newest version** is the latest version from the creator and may contain changes TavernKeeper has not scanned.

Companion omits any choice that is not a forward update. If the scanned version is already installed but a newer creator version exists, it says **You already have the latest scanned version.** and offers only **Newest version**.

The selected version is bound to the installed commit Companion just checked. If the catalog or installed extension changes before the update starts, Companion stops and asks you to check again.

## What Companion will not overwrite

Companion does not update an extension when its repository, branch, or history does not match the catalog, or when the extension has local changes. It does not stash, reset, force, roll back, or downgrade extension files.

A catalog-matched extension installed outside Companion can be updated, but it remains externally owned. Companion does not adopt it into Kits or gain uninstall ownership.

## Finish the update

After SillyTavern applies the exact version, Companion rediscovers the extension and verifies the installed commit. A successful update leaves **Reload to apply updates** visible for the current Companion session. You can update other extensions first, then choose **Reload now** once.

V1 intentionally has no bulk update, background polling, persisted update cache, or self-update control.
