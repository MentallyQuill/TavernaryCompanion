import { useEffect, useId, useRef, useState } from "preact/hooks";

import type { CatalogProject } from "../../catalog/catalog-core";
import { moveDraftMember, updateKitDraft, type KitDraftState } from "../../kits/kit-draft";
import { CategoryIcon } from "../shared/category-icon";
import { KitMemberRow } from "./kit-member-row";

type MotionPhase = "entering" | "entered" | "exiting";

function useTransitionPresence(visible: boolean, durationMs: number) {
  const [state, setState] = useState<{
    observedVisible: boolean;
    present: boolean;
    phase: MotionPhase;
  }>(() => ({
    observedVisible: visible,
    present: visible,
    phase: visible ? "entering" : "exiting",
  }));
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (state.observedVisible !== visible) {
    setState({
      observedVisible: visible,
      present: visible || state.present,
      phase: visible ? "entering" : "exiting",
    });
  }

  useEffect(() => {
    let cancelled = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    if (visible) {
      const finishEntry = () => {
        if (cancelled) return;
        setState((current) =>
          current.observedVisible ? { ...current, present: true, phase: "entered" } : current,
        );
      };
      if (reducedMotion) queueMicrotask(finishEntry);
      else {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          finishEntry();
        });
      }
    } else {
      const finishExit = () => {
        if (cancelled) return;
        setState((current) =>
          current.observedVisible ? current : { ...current, present: false, phase: "exiting" },
        );
      };
      if (reducedMotion) queueMicrotask(finishExit);
      else {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          finishExit();
        }, durationMs);
      }
    }

    return () => {
      cancelled = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [durationMs, visible]);

  return { present: state.present, phase: state.phase };
}

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
  const mobileOpenerRef = useRef<HTMLElement | null>(null);
  const restoreMobileFocusRef = useRef(false);
  const lastDraftRef = useRef<KitDraftState | null>(draft);
  const onCollapseRef = useRef(onCollapse);
  const discardDialogRef = useRef<HTMLElement>(null);
  const discardTriggerRef = useRef<HTMLButtonElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const stackRef = useRef<HTMLOListElement>(null);
  const dragCleanupRef = useRef<() => void>(() => undefined);
  const titleRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const titleCountId = `${formId}-title-count`;
  const titleErrorId = `${formId}-title-error`;
  const descriptionCountId = `${formId}-description-count`;
  const discardTitleId = `${formId}-discard-title`;
  const discardDescriptionId = `${formId}-discard-description`;
  onCollapseRef.current = onCollapse;
  if (draft) lastDraftRef.current = draft;
  const mobileSheetVisible = compact && !collapsed && draft !== null;
  const mobilePresence = useTransitionPresence(mobileSheetVisible, 220);
  const renderedDraft = draft ?? (compact && mobilePresence.present ? lastDraftRef.current : null);
  const count = renderedDraft?.projectIds.length ?? 0;
  const projectCount = `${count} ${count === 1 ? "project" : "projects"}`;
  const titleIssue = renderedDraft?.issues.find((issue) => issue.startsWith("Title"));
  const compositionIssues = renderedDraft?.issues.filter((issue) => issue !== titleIssue) ?? [];
  const mobileModalOpen = compact && mobilePresence.present && renderedDraft !== null;

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
    if (!mobileModalOpen) return;
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
        onCollapseRef.current();
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
  }, [mobileModalOpen]);

  useEffect(() => {
    if (mobileModalOpen) {
      restoreMobileFocusRef.current = true;
      return;
    }
    if (!restoreMobileFocusRef.current || mobilePresence.present) return;
    restoreMobileFocusRef.current = false;
    const timer = window.setTimeout(() => {
      const opener = mobileOpenerRef.current;
      if (opener?.isConnected) opener.focus();
      else
        panelRef.current
          ?.querySelector<HTMLButtonElement>('[aria-label="Open Kit Builder"]')
          ?.focus();
      mobileOpenerRef.current = null;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mobileModalOpen, mobilePresence.present]);

  const closeDiscard = () => {
    setConfirmDiscard(false);
    window.setTimeout(() => discardTriggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!confirmDiscard) return;
    keepEditingRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeDiscard();
        return;
      }
      if (event.key !== "Tab" || !discardDialogRef.current) return;
      const buttons = Array.from(
        discardDialogRef.current.querySelectorAll<HTMLButtonElement>("button"),
      );
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [confirmDiscard]);

  useEffect(() => {
    if (!draft) {
      setConfirmDiscard(false);
      setSubmitAttempted(false);
    }
  }, [draft]);

  useEffect(() => () => dragCleanupRef.current(), []);

  const openBuilder = (event: preact.JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    mobileOpenerRef.current = event.currentTarget;
    onStart();
  };

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

  if (compact && collapsed && !renderedDraft && !mobilePresence.present) return null;

  if (collapsed && !(compact && mobilePresence.present)) {
    if (compact && renderedDraft) {
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
            onClick={openBuilder}
          >
            <CategoryIcon name="kit-builder" />
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
        <div class="tavernary-companion-kit-builder-rail">
          <button
            type="button"
            class="tavernary-companion-kit-builder-toggle"
            aria-label="Open Kit Builder"
            onClick={openBuilder}
          >
            <CategoryIcon name="kit-builder" />
          </button>
          <span class="tavernary-companion-kit-builder-rail__label">Kit Builder</span>
          <small aria-hidden="true">{projectCount} in draft</small>
        </div>
      </aside>
    );
  }

  if (!renderedDraft) return null;
  const currentDraft = renderedDraft;
  const byId = new Map(projects.map((project) => [project.id, project]));

  return (
    <aside
      ref={panelRef}
      class="tavernary-companion-kit-builder-panel"
      aria-label="Kit Builder"
      role={compact ? "dialog" : "complementary"}
      aria-modal={compact || undefined}
      data-layout={compact ? "mobile" : "desktop"}
      data-motion-phase={compact ? mobilePresence.phase : undefined}
    >
      <header class="tavernary-companion-kit-builder-panel__header">
        <h2 tabIndex={-1}>Kit Builder</h2>
        <button
          type="button"
          class="tavernary-companion-kit-builder-collapse"
          aria-label={compact ? "Close Kit Builder" : "Collapse Kit Builder"}
          onClick={() => onCollapseRef.current()}
        >
          <CategoryIcon name={compact ? "close" : "kit-builder"} />
        </button>
      </header>
      <div class="tavernary-companion-kit-builder-panel__body">
        <div class="tavernary-companion-kit-builder-heading">
          <h2>{currentDraft.sourceId ? "Edit Kit" : "Create Kit"}</h2>
          <button
            ref={discardTriggerRef}
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
            if (currentDraft.issues.length === 0) {
              onSave(currentDraft);
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
              value={currentDraft.title}
              aria-describedby={`${titleCountId}${submitAttempted && titleIssue ? ` ${titleErrorId}` : ""}`}
              aria-invalid={(submitAttempted && Boolean(titleIssue)) || undefined}
              onInput={(event) =>
                onUpdate(updateKitDraft(currentDraft, { title: event.currentTarget.value }))
              }
            />
            <small id={titleCountId}>{currentDraft.title.length}/60 characters</small>
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
              value={currentDraft.description}
              aria-describedby={descriptionCountId}
              onInput={(event) =>
                onUpdate(updateKitDraft(currentDraft, { description: event.currentTarget.value }))
              }
            />
            <small id={descriptionCountId}>{currentDraft.description.length}/600 characters</small>
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
              {currentDraft.projectIds.length === 0 ? (
                <li class="tavernary-companion-kit-builder-empty">Add projects from the catalog</li>
              ) : null}
              {currentDraft.projectIds.map((id) => {
                const project = byId.get(id);
                return (
                  <KitMemberRow
                    key={id}
                    id={id}
                    name={project?.name ?? id}
                    kind={project?.kind ?? "extension"}
                    onDragStart={(event) => beginPointerReorder(currentDraft, id, event)}
                    onMove={(direction) => onUpdate(moveDraftMember(currentDraft, id, direction))}
                    onRemove={() =>
                      onUpdate(
                        updateKitDraft(currentDraft, {
                          projectIds: currentDraft.projectIds.filter(
                            (candidate) => candidate !== id,
                          ),
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
        <div
          class="tavernary-companion-kit-discard-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDiscard();
          }}
        >
          <section
            ref={discardDialogRef}
            class="tavernary-companion-kit-discard-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={discardTitleId}
            aria-describedby={discardDescriptionId}
          >
            <h2 id={discardTitleId}>Discard Kit changes?</h2>
            <p id={discardDescriptionId}>Your unsaved changes will be lost.</p>
            <div class="tavernary-companion-kit-discard-actions">
              <button
                ref={keepEditingRef}
                type="button"
                class="tavernary-companion-kit-discard-keep"
                onClick={closeDiscard}
              >
                Keep editing
              </button>
              <button
                type="button"
                class="tavernary-companion-kit-discard-confirm"
                onClick={onDiscard}
              >
                Discard changes
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
