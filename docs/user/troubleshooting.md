# Troubleshooting

Use the section that matches what you see. Start with the smallest action, then try again once.

## The catalog does not load

1. Check your internet connection.
2. Choose **Refresh** in Companion.
3. If the network is down, use the last compatible cached catalog for browsing.

Cached browsing may limit install actions. Companion will tell you when a fresh catalog is needed.

If Companion says it needs an update before it can refresh or change installed extensions, update Companion first and reopen it.

## The project list looks old

Choose **Refresh**. Companion may show cached projects first, then replace them after the fresh catalog arrives.

If a project changed while you were looking at it, reopen its details before installing. A lifecycle action can stop when the project or installed state changed after review.

## The Install button is disabled

Read the reason on the project card. Common reasons are:

- the project is browse-only;
- it is not a managed install target for this build;
- its install contract is unavailable;
- a safety or compatibility condition needs your attention;
- the catalog is cached and a fresh check is required.

Presets are browse-only in this pre-alpha build.

## The first-install warning keeps appearing

The disclosure is a reminder that third-party extensions run code inside SillyTavern. Read it before the first install and choose **I understand** only when you want to continue. Choose **Cancel** if you want to review the project more first.

TavernKeeper information is evidence, not a guarantee. Read the [Checks and trust](safety-and-trust.md) guide for the version-choice and ownership rules.

## The install says it worked, but I cannot find the extension

Companion waits for SillyTavern to confirm the installed state.

1. Open **Installed** and choose **Check again**.
2. Refresh SillyTavern if the extension list is stale.
3. Close and reopen Companion.
4. Check the operation receipt for the exact step that stopped.

Do not repeat the install many times while the first result is still processing.

## An installed extension disappeared

Another process may have changed the files outside Companion. Open **Installed** and choose **Check again** so Companion reads the real state again.

If it was a missing member of a Kit, the Kit can show **Partial** or **Missing**. The saved Kit list is still there.

If the Installed entry offers **Forget record**, use it only after you are sure the extension is no longer present. Forgetting the record removes Companion's old memory; it does not delete extension files.

## An update cannot run

- **Could not check:** choose **Retry**.
- **Needs attention:** use SillyTavern's extension manager to inspect the repository, branch, history, or local files.
- **Newest version only:** this host does not accept a specific TavernKeeper-scanned revision. Choose the newest creator version if you want to continue.
- **Local changes:** Companion will not stash, reset, force, roll back, or downgrade your work.

A catalog-matched extension installed outside Companion can sometimes update, but it stays external. Companion does not adopt it into a Kit or gain uninstall ownership.

## A Kit says Partial, Missing, or Drifted

- **Partial:** some Kit members are installed and some are not.
- **Missing:** none of the Kit members are installed.
- **Drifted:** installed or enabled extensions no longer match the Kit's last verified state.

Open the Kit details and read the member list. You can apply the Kit again, install missing members, or fix the outside change in SillyTavern first.

## A Kit operation stopped

Read the Kit receipt. It lists each member as finished, left alone, not started, or needing attention.

- Choose **Try again** when the receipt offers it.
- Choose **Reload now** when the receipt says a reload is required.
- If the old active Kit is still named, that is the Kit Companion kept active after the interruption.

Companion does not pretend that an unfinished member succeeded.

## A bulk uninstall only partly worked

Verified removals stay removed. Extensions that could not be removed stay installed and remain selected for **Retry failed**.

Read the receipt before trying again. The affected Kits may now be **Partial**, **Missing**, or **Drifted**, but their saved definitions are not deleted.

## I need to report a problem

Include:

- what you clicked, in order;
- the project or Kit link;
- the exact reason text on the card or dialog;
- a screenshot of the warning or receipt;
- whether the extension was managed by Companion or installed outside it.

Do not include credentials, private tokens, or private files in a support report.
