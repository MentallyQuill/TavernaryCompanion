# Checked or Newest Install Choice Design

## Goal

Let players choose between the version TavernKeeper most recently checked and the newest version from the project creator. Keep the choice friendly, brief, and local to the install action. Do not describe either version as safe, unsafe, verified, or recommended.

The feature applies to individual project installs and to projects installed through Kits. It preserves Companion's existing lifecycle policy, trust prompts, exact project identity checks, serialized operations, and verified ownership rules.

## Product language

The normal interface uses plain language. Commit hashes, branch names, catalog timestamps, and host capability details stay in optional technical details and operation records.

When the two versions differ, the individual chooser reads:

> **Which version would you like?**
>
> **Checked version**  
> TavernKeeper checked this version on Aug 17.
>
> **Newest version**  
> The latest version from the creator. It may include changes TavernKeeper hasn't checked yet.

The choices are never labelled "safe version," "secure version," "risky version," "verified version," or "recommended version." A TavernKeeper check is useful information, not a guarantee.

Supporting messages use the same tone:

- Unavailable checked version: "That checked version isn't available anymore. You can choose the newest version or cancel."
- Older SillyTavern: "Update SillyTavern to use the checked version."
- Latest lookup failed: "We couldn't find the newest version. Try again."
- Install mismatch after cleanup: "The install didn't finish correctly, so Companion cleaned it up."
- Success: "Installed the checked version." or "Installed the newest version."

The existing TavernKeeper assessment remains reachable from the card scan control. Operation details may show the full selected and installed commit hashes for users who want them.

## When Companion asks

Companion asks only when there is a real choice.

| State | Individual install behavior |
| --- | --- |
| No usable TavernKeeper report | Keep the current single Install action and install the newest resolved version. |
| Checked and newest revisions match | Keep the current single Install action and install that exact revision. |
| Checked and newest revisions differ | Open the two-choice version chooser. |
| Checked revision exists but the host cannot pin commits | Show the chooser when the catalog indicates a difference, disable Checked version with the update message, and keep Newest version available. |
| Newest revision cannot be resolved on a capable host | Do not guess from stale data. Show the retry message and leave the project unmodified. |

The chooser is a compact non-modal surface anchored to the existing Install control. It has a visible heading, two full-width choice buttons, outside-click dismissal, Escape dismissal, and focus restoration to Install. Selecting a choice starts the existing install flow immediately; there is no extra Continue step.

The card does not gain two permanent install buttons, and Companion does not add a top-bar preference or remember a default choice.

## Immutable install targets

The UI creates a typed install target. Downstream policy and execution never infer the target from a label or current UI state.

```ts
type InstallTarget =
  | {
      kind: "checked";
      requestedSha: string;
      checkedAt: string;
      reportId: string;
      reportUrl: string;
    }
  | {
      kind: "newest";
      requestedSha: string | null;
      resolvedAt: string | null;
    };
```

On a host with pinned-install support, both choices resolve to full 40-character commit hashes before mutation. "Newest" means the head of the install contract's configured branch at the time the choice is prepared; a null branch means the repository's default branch. Binding the newest choice to the resolved hash prevents the branch from changing the installed content between selection and checkout.

On an older host, only Newest is executable. It uses the existing repository-and-branch install behavior and records the locally observed hash afterward when revision lookup is available. Checked is never emulated with a branch argument because Git clone cannot reliably treat an arbitrary commit hash as a branch.

## Host capability contract

Companion extends `HostExtensionAdapter` with three explicit capabilities:

1. Report whether remote-revision resolution, pinned installation, and local-revision lookup are supported.
2. Resolve the full commit hash at the configured install branch without modifying the local filesystem.
3. Install an exact full commit hash and return or expose the checked-out local hash.

The compatible SillyTavern extension API advertises a versioned pinned-install capability. Companion must not detect support by sending an unknown commit field to the legacy install endpoint because current hosts ignore fields they do not understand.

For a pinned install, the host:

1. validates the repository URL, branch, and lowercase or uppercase 40-hex commit hash;
2. fetches the requested commit from the same repository used by the catalog install contract;
3. stages the extension outside the final extension directory;
4. checks out the exact revision while retaining a usable relationship with the configured branch;
5. verifies the root manifest and local `HEAD`;
6. moves the staged directory into its final location only after verification;
7. runs the extension install hook only after the verified move; and
8. removes staging state on every failure.

Companion reads the installed local revision after the host call and requires exact equality with `requestedSha` before recording success. A mismatch fails closed and triggers cleanup of the newly installed project. If cleanup itself fails, Companion reports that the install needs attention and does not record managed ownership.

## Target-aware trust prompts

Trust policy receives the selected target.

- When the selected SHA equals the report's scanned SHA, the assessment covers the selected version even if a newer project version exists.
- When Newest is selected and differs from the report SHA, the assessment covers an older version.
- Material- and high-concern assessment prompts still appear for every install attempt.
- Neutral, low-concern, and unassessed projects do not gain another warning after the player has already made the version choice.

New target-specific sentences use the same plain-language style as the chooser. The choice surface does not repeat the assessment severity; the existing scan control and any required trust prompt own that information.

## Individual install flow

1. Revalidate catalog compatibility, project identity, install eligibility, and absence from the host.
2. Read host capabilities.
3. On a capable host, resolve the current install-branch head.
4. Compare it with the latest usable TavernKeeper report SHA.
5. Prepare one exact target or open the chooser for two distinct targets.
6. Run the existing one-time extension disclosure and any required TavernKeeper concern prompt for the selected target.
7. Submit the typed target to the lifecycle coordinator.
8. Install, rediscover the expected folder, read local `HEAD`, and verify the exact selected SHA when pinned.
9. Record managed ownership, provenance, and a receipt only after verification.

If a selected checked revision becomes unavailable, Companion stops. It offers Newest or Cancel and never substitutes automatically. Choosing Newest creates a new target and reruns applicable target-aware trust policy before mutation.

## Kit preflight and execution

Kit installation keeps one preflight surface. Every project that will be installed appears in the list.

- A project with distinct checked and newest revisions gets a labelled two-choice radio group.
- A project with one meaningful target shows that target without requiring another decision.
- Checked is disabled with the plain update message when the host lacks pinned-install support.
- The Kit action remains disabled until every project with a real choice has a selection.

Preflight resolves and validates all selected targets before the first mutation. The frozen Kit plan includes the target for every install step, and approval binds the exact target set along with the existing catalog and inventory fingerprints.

Execution remains sequential. If a checked revision becomes unavailable after preflight, the Kit pauses at that project. Completed steps remain truthfully reported; unstarted steps remain untouched. The player may choose Newest for that project or cancel the remaining work. Companion reruns target-aware policy for any changed choice.

## Persistence and receipts

Managed install provenance is additive and backward compatible:

```ts
type ManagedInstallProvenance =
  | {
      targetKind: "checked" | "newest";
      requestedSha: string | null;
      installedSha: string | null;
      catalogGeneratedAt: string;
      tavernKeeperReportId: string | null;
    }
  | {
      targetKind: "legacy-unknown";
      requestedSha: null;
      installedSha: null;
      catalogGeneratedAt: null;
      tavernKeeperReportId: null;
    };
```

Existing managed records normalize to `legacy-unknown` without changing ownership. No existing installation is relabelled as checked.

Install receipts store the same provenance plus capability mode and cleanup outcome. Default receipt copy stays short. An optional Details disclosure exposes exact hashes and report identity.

Provenance describes the verified installation event, not permanent current state. Companion does not show a lasting "Checked" badge unless it has re-read the extension's current local `HEAD`; the extension may have been updated outside Companion.

## Failure and compatibility behavior

- Capability lookup absent or unsupported: Checked is unavailable; Newest remains compatible with the existing install path.
- Remote head lookup failure on a capable host: no mutation; Retry only.
- Malformed report SHA: treat the report as unusable for installation while leaving its display evidence intact.
- Checked commit unavailable: offer Newest or Cancel before mutation.
- Pinned checkout mismatch: host removes staging state; Companion does not record ownership.
- Post-install local hash mismatch: Companion requests cleanup, does not record ownership, and reports whether cleanup succeeded.
- Profile persistence failure after verified install: retain the existing installed-unrecorded recovery behavior and include the observed hash in the in-memory receipt.
- Catalog or inventory drift before execution: rebuild the choice or Kit preflight rather than applying a stale target.

All errors avoid blame and security theatre. Detailed host failures remain sanitized and appear only in technical diagnostics.

## Accessibility and responsive behavior

The individual chooser is reachable from the existing 44px lifecycle control. Its heading is announced, each choice has one accessible name plus descriptive text, and disabled Checked copy is associated with the disabled control. Keyboard users can open, select, dismiss with Escape, and return focus without entering a modal focus trap.

The chooser remains within the Companion popup's top layer and repositions within the viewport. At mobile widths it may use the same compact overlay at available width, but it must not become a full-screen confirmation page. It must remain usable at 200% text, with reduced motion, touch input, and screen-reader navigation.

Kit target choices use native radio semantics grouped by project name. Errors and paused-step decisions receive focus and are announced without discarding the player's earlier selections.

## Testing and proof

Unit coverage includes:

- every report/current-revision/capability state;
- plain-language copy and prohibited safety claims;
- exact target construction and validation;
- target-aware trust freshness;
- managed-record normalization and receipt provenance;
- individual chooser keyboard and dismissal behavior;
- mixed Kit selections, frozen approvals, and changed-choice revalidation.

Integration coverage uses temporary Git repositories with at least two commits and proves:

- checked and newest selections install different expected revisions;
- branch movement after selection cannot change the pinned result;
- unavailable commits never fall through to Newest;
- host staging is removed after checkout or manifest failure;
- Companion records ownership only when local `HEAD` equals the selected SHA;
- Kit execution preserves completed and unstarted steps around a paused failure.

Browser coverage exercises desktop, mobile, touch, keyboard, 200% text, and reduced motion for the card chooser and Kit preflight. Real-host proof records the compatible SillyTavern capability response, selected target, installed local `HEAD`, Companion receipt, and cleanup behavior separately from repository-harness tests.

## Delivery order

1. Land the versioned SillyTavern capability and pinned-install contract with host-side Git tests.
2. Add Companion domain types, capability-aware host adapter behavior, provenance, and target-aware trust policy.
3. Add the individual chooser and Kit preflight selections.
4. Run focused, full, browser, packaging, and real-host gates.
5. Ship Companion with graceful behavior on older SillyTavern versions.

## Non-goals

- A global Checked/Newest preference.
- Remembering a default across installs.
- Calling a TavernKeeper scan a safety guarantee.
- Silently falling back from Checked to Newest.
- Intercepting or blocking updates performed outside Companion.
- Redesigning project cards or the TavernKeeper results surface.
- Changing Tavernary catalog schema or TavernKeeper scan policy.
