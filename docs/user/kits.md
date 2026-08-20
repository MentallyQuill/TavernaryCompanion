# Kits (extension sets)

Kits are saved extension sets you can switch between.

## Kit types

There are two main kit types:

- Personal Kit: yours to rename, edit, and update in Companion.
- Published Kit: a read-only starting point you can inspect and use.

A Kit is also a shared list of extension slots. It is not a copy of your extension files.

## Installed vs active

- The Installed view shows what is currently installed in SillyTavern.
- The Active Kit is the kit you are using now.
- Installed and active can differ until you complete a switch or install flow.

Installed Kits appear in a compact row above the installed extensions. Each Kit shows how many
of its members are present. Its status explains the current relationship:

- **Active:** the Kit currently defines the enabled state for Companion-managed extensions.
- **Partial:** some Kit extensions are not installed.
- **Drifted:** installed or enabled extensions no longer match the last verified Kit state.
- **Missing:** none of the Kit extensions are installed.

Removing one or more members does not delete the Kit. The Kit remains as saved intent and changes
to Partial, Missing, or Drifted as appropriate. Use **Uninstall Kit** when you want to remove the
installed Kit association itself.

## Select members from Installed

Choose an Installed Kit to enter selection mode and select the extensions from that Kit that are
currently installed. You can select more Kits to combine their members, or select and clear
individual extension cards. Shared members are counted once. **Clear** empties the selection and
exits selection mode.

Choose **Add to Kit** to add the selection to a new Kit or an existing Personal Kit. The Kit Builder
opens with those extensions staged for review. Adding an extension to a Kit never transfers
ownership: externally installed extensions remain external, and Companion-managed extensions
remain Companion-managed.

## Switch or save a kit

1. Open Kits.
2. Pick the target kit.
3. Apply the kit.
4. Confirm the planned changes.

Companion keeps already installed shared extensions when possible.

## Keep shared extensions

Some extensions may exist in more than one kit.

Companion tries to avoid uninstalling an extension if it is also used by your target kit.

## Import and export

You can export a Personal Kit to a JSON file and later import it on another account or install.

Imported kits are validated before they apply.

## Incomplete Kit reminders

If a kit is missing an extension file or compatibility target, Companion shows a warning before changing anything.

Fix missing pieces first, or let the change apply with the warning if you choose to continue.
