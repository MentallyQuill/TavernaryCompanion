# V2 Kit Submission

## Goal

V2 should let a user turn a personal Kit into a Tavernary community submission without requiring Companion to hold GitHub credentials or bypass Tavernary moderation. V1 does not expose this flow, but its Kit format and boundaries must make V2 an additive experience rather than a data migration project.

## V1 readiness contract

V1 personal Kits retain:

- A local UUID distinct from a future Tavernary Kit ID.
- Title and description.
- Target frontend.
- Ordered canonical Tavernary project IDs.
- Creation and update timestamps.
- Origin type and optional published Tavernary Kit ID.
- A local portable-format version.

V1 keeps installed folders, enabled state, managed ownership, operation receipts, and host information outside the portable definition. No submission control, GitHub URL builder, clipboard transport, issue status, or authentication code ships in V1.

## Planned entry point

V2 adds **Submit to Tavernary** to the personal Kit overflow menu and editor completion screen. It appears only for a saved personal Kit. A personal copy of a published Kit may submit as a new Kit; a Kit with an eligible published origin may instead offer **Propose edit** when Tavernary's current rules allow the GitHub user to make that request.

The action opens a submission-readiness view rather than navigating immediately to GitHub.

## Submission-readiness view

The view explains that Tavernary submissions are public, reviewed through GitHub, and do not transfer local installation state. It evaluates the current Tavernary rules through shared Kit-domain validation:

- Title contains 3–60 characters.
- Description contains 1–600 characters.
- Kit contains 3–50 published projects.
- Exactly one frontend appears first.
- At least two non-frontend projects exist.
- No duplicate, unavailable, flagged, or unknown projects exist.
- Title and description pass current markup/link and moderation rules.

Each failure links directly to the editor field or component that must change. Passing readiness is not described as approval; it means the draft is structurally ready for GitHub review.

For Companion-created Kits, SillyTavern is projected as the first frontend component. It remains context and is never a lifecycle target.

## Review experience

The user sees a final public preview containing:

- Title and description exactly as they will be submitted.
- Ordered project names and canonical IDs.
- Frontend and component counts.
- Any projects whose assessment or availability changed since the Kit was saved.
- A disclosure that GitHub account identity and issue content become public.

The user must explicitly choose **Continue to GitHub review**. Companion does not submit in the background.

## Tavernary manifest projection

V2 projects the personal definition into Tavernary's existing manifest shape:

```json
{
  "operation": "create",
  "kit_id": null,
  "title": "Kit title",
  "description": "Kit description",
  "project_ids": ["frontend-first", "project-1", "project-2"]
}
```

For edits, `operation` is `edit` and `kit_id` is the stable published Kit ID. The projection is a pure function in shared Kit-domain code so Tavernary's website and Companion serialize identically.

## GitHub handoff

The approved transport remains Tavernary's public GitHub issue workflow:

1. Companion serializes the validated manifest.
2. It opens Tavernary's Kit-submission issue form with safe prefills.
3. It copies the manifest to the clipboard when browser constraints prevent complete field prefill.
4. The user reviews and submits while authenticated directly with GitHub.
5. Tavernary automation revalidates, moderates, publishes, deploys, and closes or requests correction.

Companion never requests a GitHub token, reads private issues, claims submission success before GitHub does, or writes Tavernary registry files directly.

## Return and follow-up

Before handoff, Companion retains the local Kit and a non-authoritative `submissionStartedAt` marker. On return, it says **GitHub review opened** rather than **Submitted** unless the browser can prove a resulting public issue URL through an approved future contract.

Publication appears naturally through the living catalog refresh. When a published Kit matches a recorded issue/published ID, Companion may offer to link the personal origin or keep both. It never deletes the personal Kit automatically.

Correctable GitHub failures return the user to the retained personal draft. The readiness view revalidates against the latest catalog and current rules before another handoff.

## Privacy and safety

- Submission includes only the reviewed public manifest and GitHub-provided issue identity.
- Local UUID, installed state, host details, folders, logs, operation receipts, and settings are excluded.
- The review warns users not to include secrets or private personal information.
- Current Tavernary blocked-user, severe-language, uniqueness, duplicate, project-status, and authorship rules remain server-authoritative.
- A locally passing draft can still be rejected by GitHub or Tavernary automation.

## UI relationship to V1

The V2 readiness view reuses the personal Kit editor, project inspector, availability badges, and CatalogCore validation concepts. It adds one route and one transport adapter without changing installation, active Kit, or managed ownership state.

Submission readiness is visually separate from installation readiness:

- **Ready to install** concerns eligible local lifecycle targets.
- **Ready for Tavernary review** concerns public Kit structure and moderation.

Neither state implies the other.

## Approach

V1's local Kit document is the source. A future `KitSubmissionProjection` produces Tavernary's public draft. Shared Kit-domain validation evaluates it. A `GitHubSubmissionHandoff` opens the public issue form and clipboard fallback. These components have no access to HostExtensionAdapter or ManagedExtensionRegistry, preventing local operational data from leaking into submissions.

## V2 acceptance

- A V1-created Kit can be validated and projected without local-format migration.
- Readiness errors lead directly to correctable fields or projects.
- The generated manifest matches Tavernary's website serializer exactly.
- No GitHub credential enters Companion.
- The user performs the final public review and submission on GitHub.
- Local installation and management state never appears in the public payload.
- Catalog refresh, not optimistic local state, establishes publication.
