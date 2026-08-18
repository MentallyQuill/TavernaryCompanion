# Project Lifecycle and Trust

## Goal

Individual extension management should feel immediate without concealing that extensions execute code inside SillyTavern. The user sees one clear action, understands when Companion can act, receives extra protection when TavernKeeper reports concern, and gets an authoritative result after SillyTavern confirms installed state.

## Eligibility

An **Install** action appears only when the current catalog entry is:

- Published and active.
- An extension for the SillyTavern frontend.
- Backed by a validated repository-root manifest.
- Accompanied by a valid `sillytavern-extension-git` install contract.
- Not Tavernary Companion itself.

The UI may explain failed eligibility, but it never manufactures a URL from `canonicalUrl`, a source link, a repository guess, or user input.

## Installation journey

1. The user selects **Install** from a card or detail.
2. Companion locks lifecycle actions and revalidates eligibility against the current in-memory catalog.
3. Host discovery confirms the project is not already installed under its canonical identity.
4. Required disclosures or warnings appear.
5. The action shows in-progress state in the card and operation tray.
6. HostExtensionAdapter requests installation.
7. Companion rediscovers extensions and verifies the expected folder/manifest identity.
8. On verification, the project becomes installed and managed; otherwise the receipt reports failure without optimistic success.
9. A reload is requested only when the host requires it.

Repeated clicks cannot create duplicate requests. Closing the overlay does not cancel a host request already in progress; reopening shows the same operation.

## One-time trust disclosure

The first eligible installation in a profile explains:

- Third-party extensions run unsandboxed code inside SillyTavern.
- Tavernary metadata and TavernKeeper scanning do not guarantee safety.
- The user should review the project and source before installing.
- Companion will use the catalog's validated install contract and will record the project as managed.

The disclosure is acknowledged once per profile. Resetting Companion trust settings makes it appear again. A schema or terms change may intentionally invalidate the stored acknowledgement through a disclosure-version field.

## Assessment warnings

Every installation with a latest available TavernKeeper assessment of **Material concern** or **Immediate danger** requires a fresh confirmation, even after the general disclosure was acknowledged.

Approved base copy:

> TavernKeeper's latest assessment identified potential security concerns in this project. Extensions can run code inside SillyTavern. You are responsible for deciding whether to trust and install this project. Review the TavernKeeper assessment and the project before continuing.

Actions:

- **Review assessment**
- **Cancel**
- **Install anyway**

For stale assessments, the first sentence uses “latest available assessment” and adds: “This assessment covers an older version of the project.” Immediate danger uses Tavernary's exact label, red presentation, and the report's danger basis when available. Reviewing the assessment does not erase the pending decision; returning restores the dialog with no automatic install.

Kit installation uses one consolidated warning listing each flagged project, its current risk label, freshness, and assessment link. The user approves the batch once or cancels it entirely before any lifecycle request begins.

## Installation result states

- **Installed:** host rediscovery found the expected extension identity.
- **Already installed externally:** no install occurs; the project remains external unless a future explicit adoption feature is designed.
- **Rejected before request:** contract, schema, self-protection, or eligibility validation failed.
- **Host rejected:** SillyTavern returned a safe error summary.
- **Verification failed:** the request returned but expected installed identity was not discovered.
- **Reload required:** operation succeeded and a single coordinated reload remains.

The receipt names what happened and what remains safe to do. Technical details are expandable and redact credentials, absolute server paths, request headers, and unrelated server logs.

## Uninstall journey

Individual **Uninstall** is an explicit user request and may target a managed or external extension. Preflight shows:

- Whether the extension is managed or external.
- Installed Kits that reference it.
- Whether removing it will make an installed or active Kit incomplete.
- Whether SillyTavern reports it as global or otherwise non-removable for this user.

If an active or installed Kit references the project, the confirmation explains the impact and updates successful Kit state after removal. Companion does not silently preserve a direct uninstall merely because a Kit references it; the explicit individual action has higher authority than Kit convenience.

After host deletion, Companion rediscovers installed state, removes successful managed ownership, marks affected Kits incomplete, and produces a receipt. Uninstall warnings concern consequences, not TavernKeeper risk.

## Managed versus external ownership

Management ownership is an explicit Companion record keyed by canonical project identity and verified host installation identity.

- Installing through Companion creates managed ownership after verification.
- Kit installation creates ownership only for projects Companion actually installs.
- Discovering a matching manual installation does not silently adopt it.
- Removing an extension successfully deletes its ownership record.
- Missing managed extensions are reconciled as absent, not recreated automatically.

The UI consistently labels **Managed by Companion** and **Installed outside Companion**. Kit plans treat external members as already present context but never enable, disable, or remove them.

## Companion self-protection

Tavernary Companion is outside its own lifecycle domain:

- Its card displays **Current extension**.
- **View project** and **Manage in SillyTavern** are the only actions.
- Lifecycle services reject install, remove, enable, disable, and management operations by canonical Companion project ID.
- Imported state, stale caches, and direct service calls cannot bypass the rule.
- Companion cannot be added to a personal Kit.

Self-update from a schema mismatch is a handoff to SillyTavern's native extension manager, not an in-place self-modification.

## Interaction and visual states

Primary actions have idle, hover/focus, confirming, queued, running, succeeded, failed, and reload-required states. The card action and operation tray show the same operation ID so the user does not see contradictory states.

Success uses restrained confirmation, not a security-colored badge. Destructive removal uses a distinct semantic treatment from immediate-danger red so the meanings remain separable through label, icon, and placement.

## Approach

The UI submits intent to a lifecycle service; it never calls endpoints directly. The service validates catalog identity, warning policy, and the self-protection invariant before HostExtensionAdapter acts. State changes are committed only after host rediscovery. Managed ownership and Kit references are updated from the verified result in one persistence operation.

## Lifecycle acceptance

- No ineligible project exposes Install through card, detail, keyboard shortcut, or imported state.
- First install requires the general disclosure exactly once per disclosure version.
- Every material/high concern install requires the approved warning.
- A host success response without rediscovered identity does not display Installed.
- External installations remain outside Kit control.
- Direct removal clearly reports affected Kits.
- Companion cannot target itself at any layer.
