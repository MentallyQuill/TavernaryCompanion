import { createPortal } from "preact/compat";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import type { PreparedUpdateChoice } from "../../updates/update-coordinator";
import type { PreparedUpdateSelection } from "../../updates/update-types";
import { checkedVersionDescription } from "../lifecycle/install-version-chooser";
import { resolveOverlayPortalTarget } from "../shared/overlay-portal";

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

interface UpdateVersionChooserProps {
  projectId: string;
  projectName: string;
  anchor: HTMLElement;
  choice: PreparedUpdateChoice;
  onSelect(selection: PreparedUpdateSelection): void;
  onCancel(): void;
}

export function UpdateVersionChooser({
  projectId,
  projectName,
  anchor,
  choice,
  onSelect,
  onCancel,
}: UpdateVersionChooserProps): preact.JSX.Element | null {
  const surfaceRef = useRef<HTMLElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const settled = useRef(false);
  const [position, setPosition] = useState<preact.JSX.CSSProperties>({
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
    visibility: "hidden",
  });
  const headingId = `update-version-${projectId}-heading`;

  const cancel = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
    const restoreFocus = () => {
      if (anchor.isConnected) anchor.focus({ preventScroll: true });
    };
    restoreFocus();
    queueMicrotask(restoreFocus);
  }, [anchor, onCancel]);

  const select = useCallback(
    (selection: PreparedUpdateSelection) => {
      if (settled.current) return;
      settled.current = true;
      onSelect(selection);
    },
    [onSelect],
  );

  const updatePosition = useCallback(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    setPosition(positionChooser(anchor.getBoundingClientRect(), surface.getBoundingClientRect()));
  }, [anchor]);

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(anchor);
    if (surfaceRef.current) observer?.observe(surfaceRef.current);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      observer?.disconnect();
    };
  }, [anchor, updatePosition]);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || surfaceRef.current?.contains(target)) return;
      cancel();
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape, true);
    firstChoiceRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape, true);
    };
  }, [cancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div class="tavernary-companion-install-version-chooser-backdrop">
      <section
        ref={surfaceRef}
        class="tavernary-companion-install-version-chooser"
        role="dialog"
        aria-labelledby={headingId}
        style={{ position: "fixed", ...position }}
      >
        <h2 id={headingId}>Update {projectName}</h2>
        {choice.notice ? (
          <p class="tavernary-companion-install-version-chooser__notice" role="status">
            {choice.notice}
          </p>
        ) : null}
        {choice.selections.map((selection, index) => {
          const checked = selection.target.kind === "checked";
          const description =
            selection.target.kind === "checked"
              ? `The latest version scanned by TavernKeeper. ${checkedVersionDescription(selection.target.checkedAt)}`
              : "The latest version from the creator. It may include changes TavernKeeper hasn't checked yet.";
          const descriptionId = `${headingId}-${selection.target.kind}-description`;
          return (
            <button
              key={`${selection.target.kind}-${selection.target.requestedSha}`}
              ref={index === 0 ? firstChoiceRef : undefined}
              type="button"
              aria-label={checked ? "Latest scanned version" : "Newest version"}
              aria-describedby={descriptionId}
              onClick={() => select(selection)}
            >
              <strong>{checked ? "Latest scanned version" : "Newest version"}</strong>
              <span id={descriptionId}>{description}</span>
            </button>
          );
        })}
        <button
          type="button"
          class="tavernary-companion-install-version-chooser__cancel"
          onClick={cancel}
        >
          Cancel
        </button>
      </section>
    </div>,
    resolveOverlayPortalTarget(anchor),
  );
}

function positionChooser(anchor: DOMRect, chooser: DOMRect): preact.JSX.CSSProperties {
  const width = Math.min(360, Math.max(0, window.innerWidth - VIEWPORT_MARGIN * 2));
  const measuredWidth = Math.min(chooser.width || width, width);
  const measuredHeight = Math.min(chooser.height, window.innerHeight - VIEWPORT_MARGIN * 2);
  const left = clamp(
    anchor.right - measuredWidth,
    VIEWPORT_MARGIN,
    window.innerWidth - measuredWidth - VIEWPORT_MARGIN,
  );
  const below = anchor.bottom + ANCHOR_GAP;
  const above = anchor.top - measuredHeight - ANCHOR_GAP;
  const top = clamp(
    below + measuredHeight <= window.innerHeight - VIEWPORT_MARGIN ? below : above,
    VIEWPORT_MARGIN,
    window.innerHeight - measuredHeight - VIEWPORT_MARGIN,
  );
  return { left, top, width, visibility: "visible" };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
