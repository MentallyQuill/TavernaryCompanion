import { createPortal } from "preact/compat";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import type {
  PreparedInstallSelection,
  PreparedInstallTargetChoice,
} from "../../lifecycle/lifecycle-coordinator";

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

type VersionChoice = Extract<PreparedInstallTargetChoice, { kind: "choose" }>;

interface InstallVersionChooserProps {
  projectId: string;
  projectName: string;
  anchor: HTMLElement;
  choice: VersionChoice;
  notice?: string | null;
  onSelect(selection: PreparedInstallSelection): void;
  onCancel(): void;
}

export function InstallVersionChooser({
  projectId,
  projectName,
  anchor,
  choice,
  notice = null,
  onSelect,
  onCancel,
}: InstallVersionChooserProps): preact.JSX.Element | null {
  const surfaceRef = useRef<HTMLElement>(null);
  const checkedRef = useRef<HTMLButtonElement>(null);
  const newestRef = useRef<HTMLButtonElement>(null);
  const settled = useRef(false);
  const [position, setPosition] = useState<preact.JSX.CSSProperties>({
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
    visibility: "hidden",
  });
  const headingId = `install-version-${projectId}-heading`;
  const checkedDescriptionId = `${headingId}-checked-description`;
  const checkedDisabledId = `${headingId}-checked-disabled`;
  const newestDescriptionId = `${headingId}-newest-description`;

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
    (selection: PreparedInstallSelection) => {
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
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(anchor);
    if (surfaceRef.current) observer?.observe(surfaceRef.current);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
      observer?.disconnect();
    };
  }, [anchor, updatePosition]);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (surfaceRef.current?.contains(target)) return;
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
    const firstChoice = choice.checked.disabledReason ? newestRef.current : checkedRef.current;
    firstChoice?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape, true);
    };
  }, [cancel, choice.checked.disabledReason]);

  if (typeof document === "undefined") return null;
  const checkedDescription = checkedVersionDescription(choice.checked.selection.target.checkedAt);
  const checkedDescribedBy = choice.checked.disabledReason
    ? `${checkedDescriptionId} ${checkedDisabledId}`
    : checkedDescriptionId;

  return createPortal(
    <section
      ref={surfaceRef}
      class="tavernary-companion-install-version-chooser"
      role="dialog"
      aria-labelledby={headingId}
      data-project-name={projectName}
      style={{ position: "fixed", ...position }}
    >
      <h2 id={headingId}>Which version would you like?</h2>
      {notice ? (
        <p class="tavernary-companion-install-version-chooser__notice" role="status">
          {notice}
        </p>
      ) : null}
      <button
        ref={checkedRef}
        type="button"
        aria-label="Checked version"
        aria-describedby={checkedDescribedBy}
        disabled={choice.checked.disabledReason !== null}
        onClick={() => select(choice.checked.selection)}
      >
        <strong>Checked version</strong>
        <span id={checkedDescriptionId}>{checkedDescription}</span>
        {choice.checked.disabledReason ? (
          <span id={checkedDisabledId}>{choice.checked.disabledReason}</span>
        ) : null}
      </button>
      <button
        ref={newestRef}
        type="button"
        aria-label="Newest version"
        aria-describedby={newestDescriptionId}
        onClick={() => select(choice.newest.selection)}
      >
        <strong>Newest version</strong>
        <span id={newestDescriptionId}>
          The latest version from the creator. It may include changes TavernKeeper hasn't checked
          yet.
        </span>
      </button>
      <button
        type="button"
        class="tavernary-companion-install-version-chooser__cancel"
        onClick={cancel}
      >
        Cancel
      </button>
    </section>,
    document.body,
  );
}

export function dispatchPreparedInstallChoice(
  choice: PreparedInstallTargetChoice,
  onInstall: (selection: PreparedInstallSelection) => void,
  onChoose: (choice: VersionChoice) => void,
): void {
  if (choice.kind === "single") onInstall(choice.selection);
  else onChoose(choice);
}

export function checkedVersionDescription(checkedAt: string): string {
  const date = new Date(checkedAt);
  const label = Number.isNaN(date.valueOf())
    ? "recently"
    : new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(date);
  return `TavernKeeper checked this version on ${label}.`;
}

function positionChooser(anchor: DOMRect, chooser: DOMRect): preact.JSX.CSSProperties {
  const viewport = viewportBounds();
  const maxWidth = Math.max(0, viewport.width - VIEWPORT_MARGIN * 2);
  const width = Math.min(360, maxWidth);
  const measuredWidth = Math.min(chooser.width || width, maxWidth);
  const measuredHeight = Math.min(chooser.height, viewport.height - VIEWPORT_MARGIN * 2);
  const left = clamp(
    anchor.right - measuredWidth,
    viewport.left + VIEWPORT_MARGIN,
    viewport.left + viewport.width - measuredWidth - VIEWPORT_MARGIN,
  );
  const below = anchor.bottom + ANCHOR_GAP;
  const above = anchor.top - measuredHeight - ANCHOR_GAP;
  const top = clamp(
    below + measuredHeight <= viewport.top + viewport.height - VIEWPORT_MARGIN ? below : above,
    viewport.top + VIEWPORT_MARGIN,
    viewport.top + viewport.height - measuredHeight - VIEWPORT_MARGIN,
  );
  return { left, top, width, visibility: "visible" };
}

function viewportBounds(): { height: number; left: number; top: number; width: number } {
  const viewport = window.visualViewport;
  return viewport
    ? {
        height: viewport.height,
        left: viewport.offsetLeft,
        top: viewport.offsetTop,
        width: viewport.width,
      }
    : { height: window.innerHeight, left: 0, top: 0, width: window.innerWidth };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
