# Product Experience

## Goal

Tavernary Companion should make discovering and arranging SillyTavern extensions feel like managing a coherent workspace, not copying Git URLs between unrelated tools. It should bring Tavernary close enough to act on while preserving Tavernary's neutrality, evidence, breadth, and source links.

The product is successful when a new user can safely install one extension, an experienced user can assemble and switch a Kit quickly, and either user can understand exactly what Companion will change before it changes anything.

## Experience promise

The experience should feel:

- **Capable:** the full Tavernary search and filtering model is present, not a simplified promotional subset.
- **Contained:** users remain inside SillyTavern and can see that the overlay belongs to the current host session.
- **Deliberate:** security, ownership, and destructive changes are legible without turning every safe action into ceremony.
- **Fast:** cached content appears immediately, search responds as the user types, and Kit switching uses one preflight and one reload.
- **Recoverable:** network, schema, or extension failures preserve known-good state and explain the next useful action.
- **Neutral:** activity and TavernKeeper evidence inform decisions without becoming ratings, endorsements, or guarantees.

Directive influences the shell's confidence, compact control density, and beveled surfaces. Tavernary influences the information architecture, neutral evidence, card content, and discovery behavior. Companion should feel related to both without looking like a reskinned website or a campaign interface.

## User mental model

Companion has three rooms:

1. **Projects** answers “What exists, and can I use it here?”
2. **Kits** answers “What collection do I want installed or active?”
3. **Installed** answers “What is present now, and who controls it?”

The catalog is remote, public information. Personal Kits and management ownership are local profile state. Installed state comes from SillyTavern. The UI keeps those authorities distinct: a catalog card cannot claim installation from local memory, and a local Kit cannot rewrite Tavernary data.

## Primary journeys

### First open

1. The overlay opens promptly with a compact loading state.
2. If a compatible cache exists, it renders immediately while refresh occurs in the background.
3. Projects opens with SillyTavern, Extension, and Preset defaults visibly active.
4. A short orientation line explains that install controls appear only for eligible SillyTavern extensions.
5. The user can search immediately; no onboarding tour blocks discovery.

The first install, not the first open, carries the one-time unsandboxed-code disclosure. This keeps browsing approachable while placing consent at the moment it becomes meaningful.

### Discover and evaluate

1. The user searches or opens filters.
2. Results update with a visible count and removable active-filter chips.
3. Cards expose enough evidence to compare without opening every detail.
4. Selecting a card opens details while preserving the result list, query, scroll, and focused card.
5. The user can review the project source, TavernKeeper assessment, activity, and Tavernary page before acting.

### Install one project

1. The card or detail view presents one primary **Install** action.
2. Companion performs local eligibility and current-state checks.
3. The first trust disclosure or required assessment warning appears.
4. The action enters an in-progress state that cannot be started twice.
5. Companion rediscovers installed state and reports success or a specific recoverable failure.

### Build and switch Kits

1. The user chooses a published Kit, copies one, or creates a personal Kit through the Kit Builder.
2. The Kit inspector distinguishes context projects from eligible lifecycle targets.
3. **Activate Kit** presents one consolidated plan.
4. Progress is visible by project without repeated prompts.
5. Companion commits the new active Kit only after every required member verifies.
6. One reload applies the resulting extension set.

### Recover from interruption

When a network request, install, validation, or schema check fails, the UI does not collapse into a generic error page. It preserves the current route and query, explains what remains valid, and offers the smallest useful next action: retry, review, use cache, open Tavernary, manage in SillyTavern, or update Companion.

## Navigation behavior

Projects, Kits, and Installed are persistent peer routes. Route changes do not close the overlay. Each route remembers its query, scroll position, selected detail, and filter-panel state for the current session.

The overlay has one browser-like history stack for nested details and editors. Desktop Back closes a detail drawer before changing primary routes. Mobile Back closes, in order, a transient dialog, filter sheet, nested detail, then the overlay. The explicit close button always closes the overlay after handling any unsaved personal-Kit edit.

## Language and tone

Copy is plain, compact, and factual.

- Say **Install**, **Uninstall**, **Activate Kit**, and **Use cached catalog** rather than abstract verbs.
- Name the authority: “Tavernary reports,” “TavernKeeper assessed,” “SillyTavern returned,” or “Companion saved.”
- Avoid “safe,” “approved,” “recommended,” and “best” as security or quality judgments.
- Explain consequences before destructive actions and results after operations.
- Do not expose raw endpoint names, stack traces, or internal IDs unless the user expands technical details.

## Product-state hierarchy

The interface prioritizes states in this order:

1. Blocking safety or compatibility state.
2. Active lifecycle operation.
3. Installed and management ownership state.
4. TavernKeeper assessment and freshness.
5. Discovery evidence and metadata.

This prevents an activity signal or visual accent from obscuring a failed install, stale assessment, external-ownership boundary, or incompatible catalog.

## Approach

The experience is achieved through explicit authority boundaries rather than UI convention alone. CatalogCore provides Tavernary-identical discovery behavior. CatalogClient provides immediate cached rendering and safe refresh. HostExtensionAdapter provides authoritative installed state. KitPlanner turns a one-button request into a reviewable plan. CompanionShell preserves route, focus, and responsive state.

Every visible status maps to one of those authorities. No UI component infers installed state from a prior button click, invents security conclusions, or treats a saved Kit as active before the executor commits it.

## Experience acceptance

- A first-time user can identify what is installable without reading documentation.
- Clearing the SillyTavern filter makes the broader catalog feel intentionally explorable, not broken.
- The difference between saved, installed, and active Kits is visible wherever it matters.
- An external extension remains clearly outside Kit control.
- A failed Kit activation leaves the user certain which Kit is still active and which projects changed.
- Closing and reopening the overlay never loses an in-progress receipt or presents stale optimistic state.
