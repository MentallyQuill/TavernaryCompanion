# Tavernary Companion UX Design Suite

These documents expand the approved [Tavernary Companion V1 master design](../superpowers/specs/2026-08-18-tavernary-companion-design.md) into goal-oriented product and UI/UX designs. They define how the product should feel and behave before an implementation plan chooses tasks and file boundaries.

The master design is normative for product scope, security, ownership, and acceptance. These documents are normative for user journeys, interaction states, responsive behavior, and experience language. If they conflict, the master design wins until both documents are revised together.

## Documents

1. [Product Experience](01-product-experience.md) — product character, mental model, navigation, and end-to-end experience principles.
2. [Responsive Shell and Visual System](02-responsive-shell-and-visual-system.md) — overlay anatomy, desktop/mobile geometry, visual language, motion, and accessibility.
3. [Catalog Discovery](03-catalog-discovery.md) — search, filters, sorting, cards, details, and exploration beyond SillyTavern.
4. [Project Lifecycle and Trust](04-project-lifecycle-and-trust.md) — installation, removal, managed ownership, warnings, self-protection, and operation feedback.
5. [Kits](05-kits.md) — personal and published Kits, creation, switching, installation state, import/export, and partial failure.
6. [Catalog Refresh and Recovery](06-catalog-refresh-and-recovery.md) — automatic/manual refresh, cache, offline use, schema changes, and Companion update handoff.
7. [V2 Kit Submission](07-v2-kit-submission.md) — planned submission-readiness model and future GitHub review journey without adding V2 code to V1.

## Shared vocabulary

- **Project:** any Tavernary catalog entry.
- **Eligible extension:** a published SillyTavern extension with a validated install contract.
- **Browse-only project:** a visible project for which Companion offers no lifecycle action.
- **External extension:** an installed extension not placed under Companion management.
- **Managed extension:** an extension the user explicitly allowed Companion to control through a project or Kit action.
- **Personal Kit:** a profile-local, editable Kit.
- **Published Kit:** a read-only Tavernary Kit.
- **Installed Kit:** a Kit whose eligible members have been installed and recorded by Companion.
- **Active Kit:** the one installed Kit whose managed members define Companion's desired enabled set.
- **Catalog cache:** the last fully validated compatible catalog stored locally.
- **Current catalog:** a validated catalog confirmed unchanged or refreshed from Tavernary.
- **Incompatible catalog:** a valid Tavernary catalog whose schema is newer than the running Companion understands.

## Cross-document invariants

- Tavernary is the sole catalog authority; Companion never maintains a secondary catalog.
- The standard SillyTavern extension contract is the host boundary; no fork-name detection exists.
- Default discovery is SillyTavern plus extension/preset kinds, but users can explore the entire catalog.
- Only eligible SillyTavern extensions receive install or uninstall actions.
- Kit-driven operations never modify external extensions.
- Companion cannot manage itself or be added to a personal Kit.
- Material-concern and immediate-danger projects require an assessment warning on every installation.
- An incompatible schema preserves the last compatible catalog as browse-only and requires a Companion update.
- Desktop feels spacious but remains an overlay; mobile becomes a purpose-built full-height sheet.
- UI state never claims an operation succeeded until installed state has been rediscovered and verified.
