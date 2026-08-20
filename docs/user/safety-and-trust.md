# Checks and trust

Companion gives you information before an extension changes your SillyTavern setup. You still decide what to install.

## What a TavernKeeper check means

TavernKeeper examines a specific version of a project. That check is useful evidence about that version. It is not a promise that the project is safe, friendly, useful, or free from every problem.

![TavernKeeper Scan Results says that this project has not been scanned](../../tests/e2e/responsive-conformance.spec.ts-snapshots/tavernkeeper-390x844.png)

*A project can be unscanned. Read the result instead of treating an empty or gray state as approval.*

If a project has a scan, open the result when you want more detail. If Companion shows a short note, read it before continuing. You can cancel at any time.

## Read the first-install disclosure

Third-party extensions run code inside SillyTavern. Before the first extension install, Companion explains that:

- the extension is not running in a protective sandbox;
- the install comes from the catalog's validated install information;
- TavernKeeper provides evidence, not a guarantee;
- you are responsible for deciding whether to continue.

![The first-install disclosure appears before an extension is installed](../../tests/e2e/responsive-conformance.spec.ts-snapshots/lifecycle-disclosure-390x844.png)

Choose **I understand** only when you have read the message and want to continue. Choose **Cancel** when you want to stop and look at the project more closely.

## Checked version or Newest version?

When TavernKeeper checked an older version and the creator has published something newer, Companion gives you a choice:

- **Checked version:** the exact version TavernKeeper examined. It has a known check date.
- **Newest version:** the latest version from the creator. It may include changes that have not been examined yet.

Neither choice is automatically better. The Checked version gives you the checked revision. The Newest version gives you the creator's latest changes. Choose the one that fits what you want to try.

Companion does not switch from Checked to Newest by itself. If the Checked version is no longer available, it stops and lets you choose Newest or cancel.

## Who controls an extension?

Companion keeps ownership visible:

- An extension installed by Companion is **managed by Companion**.
- An extension installed by hand or another tool is **installed outside Companion**.
- Adding an external extension to a Kit does not transfer ownership.
- Companion does not edit, remove, reset, or replace an external extension just because it appears in the catalog.
- Companion cannot uninstall itself from its own Installed list.

## When an update is blocked

Companion stops when the repository, branch, history, or local files do not match the catalog information it checked. This protects local work from a silent reset or downgrade.

Use SillyTavern's extension manager to inspect an extension that needs attention. Do not delete local changes just to make Companion accept the update.

## A careful habit

For an unfamiliar extension:

1. Read the project description and source link.
2. Read any TavernKeeper result or warning.
3. Try it in a test SillyTavern profile when you can.
4. Do not give an extension credentials until you understand why it needs them.
5. Stop using it if it behaves in a way you did not expect.
