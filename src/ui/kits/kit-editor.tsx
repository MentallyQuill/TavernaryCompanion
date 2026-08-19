import { useEffect, useId, useRef, useState } from "preact/hooks";

import type { CatalogProject } from "../../catalog/catalog-core";
import { moveDraftMember, updateKitDraft, type KitDraftState } from "../../kits/kit-draft";
import { CategoryIcon } from "../shared/category-icon";
import { KitMemberRow } from "./kit-member-row";

export function KitEditor({
  draft,
  projects,
  collapsed,
  onStart,
  onUpdate,
  onCollapse,
  onDiscard,
  onSave,
}: {
  draft: KitDraftState | null;
  projects: readonly CatalogProject[];
  collapsed: boolean;
  onStart(): void;
  onUpdate(draft: KitDraftState): void;
  onCollapse(): void;
  onDiscard(): void;
  onSave(draft: KitDraftState): void;
}): preact.JSX.Element | null {
  const [compact, setCompact] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLOListElement>(null);
  const dragCleanupRef = useRef<() => void>(() => undefined);
  const titleRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const titleCountId = `${formId}-title-count`;
  const titleErrorId = `${formId}-title-error`;
  const descriptionCountId = `${formId}-description-count`;
  const count = draft?.projectIds.length ?? 0;
  const projectCount = `${count} ${count === 1 ? "project" : "projects"}`;
  const titleIssue = draft?.issues.find((issue) => issue.startsWith("Title"));
  const compositionIssues = draft?.issues.filter((issue) => issue !== titleIssue) ?? [];

  useEffect(() => {
    const root = panelRef.current?.closest<HTMLElement>(".tavernary-companion-root");
    const sync = () => {
      const width = root?.clientWidth || window.innerWidth;
      setCompact(width <= 760);
    };
    sync();
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!compact || collapsed) return;
    const panel = panelRef.current;
    const root = panel?.closest<HTMLElement>(".tavernary-companion-root");
    const background = root
      ? Array.from(
          root.querySelectorAll<HTMLElement>(
            ".tavernary-companion-shell__header, .tavernary-companion-category-navigation, .tavernary-companion-shell__content",
          ),
        )
      : [];
    const priorInert = background.map((element) => ({ element, inert: element.inert }));
    for (const element of background) element.inert = true;
    panel?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    const controls = () =>
      panel?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      ) ?? [];
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCollapse();
        return;
      }
      const focusable = controls();
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      for (const { element, inert } of priorInert) element.inert = inert;
    };
  }, [collapsed, compact, onCollapse]);

  useEffect(() => {
    if (!draft) {
      setConfirmDiscard(false);
      setSubmitAttempted(false);
    }
  }, [draft]);

  useEffect(() => () => dragCleanupRef.current(), []);

  const beginPointerReorder = (
    currentDraft: KitDraftState,
    projectId: string,
    event: preact.JSX.TargetedPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) return;
    dragCleanupRef.current();
    event.preventDefault();
    const sourceIndex = currentDraft.projectIds.indexOf(projectId);
    if (sourceIndex < 0) return;
    const pointerId = event.pointerId;
    const originY = event.clientY;
    const handle = event.currentTarget;
    const row = handle.closest<HTMLElement>("[data-project-id]");
    let targetIndex = sourceIndex;
    let dragging = false;

    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      row?.classList.remove("dragging");
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      dragCleanupRef.current = () => undefined;
    };
    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      if (!dragging && Math.abs(pointerEvent.clientY - originY) < 5) return;
      if (!dragging) {
        dragging = true;
        handle.setPointerCapture(pointerId);
        row?.classList.add("dragging");
      }
      pointerEvent.preventDefault();
      const rows = Array.from(
        stackRef.current?.querySelectorAll<HTMLElement>("[data-project-id]") ?? [],
      );
      const firstBelowPointer = rows.findIndex((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return pointerEvent.clientY < rect.top + rect.height / 2;
      });
      targetIndex = firstBelowPointer < 0 ? rows.length - 1 : firstBelowPointer;
    };
    const finish = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      if (dragging && targetIndex !== sourceIndex) {
        const projectIds = [...currentDraft.projectIds];
        const [moved] = projectIds.splice(sourceIndex, 1);
        projectIds.splice(targetIndex, 0, moved);
        onUpdate(updateKitDraft(currentDraft, { projectIds }));
      }
      cleanup();
    };
    const cancel = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId === pointerId) cleanup();
    };

    dragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
  };

  if (compact && collapsed && !draft) return null;

  if (collapsed) {
    if (compact && draft) {
      return (
        <aside
          ref={panelRef}
          class="tavernary-companion-kit-draft-pill-container"
          aria-label="Kit draft"
        >
          <button
            type="button"
            class="tavernary-companion-kit-draft-pill"
            aria-label="Open Kit Builder"
            onClick={onStart}
          >
            <CategoryIcon name="kit" />
            <span>Kit draft</span>
            <small>{projectCount}</small>
          </button>
        </aside>
      );
    }
    return (
      <aside
        ref={panelRef}
        class="tavernary-companion-kit-builder-panel collapsed"
        aria-label="Kit Builder"
      >
        <button
          type="button"
          class="tavernary-companion-kit-builder-rail"
          aria-label="Open Kit Builder"
          onClick={onStart}
        >
          <CategoryIcon name="kit-builder" />
          <span class="tavernary-companion-kit-builder-rail__label">Kit Builder</span>
          <small>{projectCount} in draft</small>
        </button>
      </aside>
    );
  }

  if (!draft) return null;
  const byId = new Map(projects.map((project) => [project.id, project]));

  return (
    <aside
      ref={panelRef}
      class="tavernary-companion-kit-builder-panel"
      aria-label="Kit Builder"
      role={compact ? "dialog" : "complementary"}
      aria-modal={compact || undefined}
      data-layout={compact ? "mobile" : "desktop"}
    >
      <header class="tavernary-companion-kit-builder-panel__header">
        <h2 tabIndex={-1}>Kit Builder</h2>
        <button
          type="button"
          class="tavernary-companion-kit-builder-collapse"
          aria-label={compact ? "Close Kit Builder" : "Collapse Kit Builder"}
          onClick={onCollapse}
        >
          <CategoryIcon name={compact ? "close" : "kit-builder"} />
        </button>
      </header>
      <div class="tavernary-companion-kit-builder-panel__body">
        <div class="tavernary-companion-kit-builder-heading">
          <h2>{draft.sourceId ? "Edit Kit" : "Create Kit"}</h2>
          <button
            type="button"
            class="tavernary-companion-kit-discard"
            aria-label="Discard draft"
            onClick={() => setConfirmDiscard(true)}
          >
            <CategoryIcon name="remove" />
          </button>
        </div>
        <form
          class="tavernary-companion-kit-builder"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.issues.length === 0) {
              onSave(draft);
              return;
            }
            setSubmitAttempted(true);
            queueMicrotask(() => titleRef.current?.focus());
          }}
        >
          <div class="tavernary-companion-kit-builder-field">
            <label for={`${formId}-title`}>Title</label>
            <input
              ref={titleRef}
              id={`${formId}-title`}
              type="text"
              maxLength={60}
              value={draft.title}
              aria-describedby={`${titleCountId}${submitAttempted && titleIssue ? ` ${titleErrorId}` : ""}`}
              aria-invalid={(submitAttempted && Boolean(titleIssue)) || undefined}
              onInput={(event) =>
                onUpdate(updateKitDraft(draft, { title: event.currentTarget.value }))
              }
            />
            <small id={titleCountId}>{draft.title.length}/60 characters</small>
            {submitAttempted && titleIssue ? (
              <span id={titleErrorId} class="tavernary-companion-kit-builder-field-error">
                {titleIssue}
              </span>
            ) : null}
          </div>
          <div class="tavernary-companion-kit-builder-field">
            <label for={`${formId}-description`}>Description</label>
            <textarea
              id={`${formId}-description`}
              maxLength={600}
              value={draft.description}
              aria-describedby={descriptionCountId}
              onInput={(event) =>
                onUpdate(updateKitDraft(draft, { description: event.currentTarget.value }))
              }
            />
            <small id={descriptionCountId}>{draft.description.length}/600 characters</small>
          </div>
          <section
            class="tavernary-companion-kit-composition"
            aria-labelledby={`${formId}-frontend`}
          >
            <h3 id={`${formId}-frontend`}>Frontend</h3>
            <div class="tavernary-companion-kit-frontend-slot">
              <CategoryIcon name="frontend" />
              <strong>SillyTavern</strong>
            </div>
          </section>
          <section class="tavernary-companion-kit-composition" aria-labelledby={`${formId}-stack`}>
            <h3 id={`${formId}-stack`}>Extensions &amp; Presets</h3>
            <ol
              ref={stackRef}
              class="tavernary-companion-kit-builder-stack"
              aria-label="Ordered Kit projects"
            >
              {draft.projectIds.length === 0 ? (
                <li class="tavernary-companion-kit-builder-empty">Add projects from the catalog</li>
              ) : null}
              {draft.projectIds.map((id) => {
                const project = byId.get(id);
                return (
                  <KitMemberRow
                    key={id}
                    id={id}
                    name={project?.name ?? id}
                    kind={project?.kind ?? "extension"}
                    onDragStart={(event) => beginPointerReorder(draft, id, event)}
                    onMove={(direction) => onUpdate(moveDraftMember(draft, id, direction))}
                    onRemove={() =>
                      onUpdate(
                        updateKitDraft(draft, {
                          projectIds: draft.projectIds.filter((candidate) => candidate !== id),
                        }),
                      )
                    }
                  />
                );
              })}
            </ol>
          </section>
          {submitAttempted && compositionIssues.length ? (
            <ul class="tavernary-companion-kit-builder-errors" aria-label="Kit validation">
              {compositionIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          <footer class="tavernary-companion-kit-builder-footer">
            <span>{projectCount}</span>
            <button
              type="submit"
              class="tavernary-companion-button tavernary-companion-button--primary"
            >
              Save Kit
            </button>
          </footer>
        </form>
      </div>
      {confirmDiscard ? (
        <div class="tavernary-companion-kit-discard-backdrop">
          <section role="alertdialog" aria-label="Discard Kit changes?">
            <h2>Discard Kit changes?</h2>
            <p>Your unsaved changes will be lost.</p>
            <div>
              <button type="button" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </button>
              <button type="button" onClick={onDiscard}>
                Discard changes
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
