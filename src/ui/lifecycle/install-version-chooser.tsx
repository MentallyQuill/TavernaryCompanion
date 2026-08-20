import { createPortal } from "preact/compat";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import type {
  PreparedInstallSelection,
  PreparedInstallTargetChoice,
} from "../../lifecycle/lifecycle-coordinator";
import type { TavernKeeperCardStatus } from "../../catalog/catalog-core";
import { resolveOverlayPortalTarget } from "../shared/overlay-portal";
import {
  isVersionChoiceOwnedTarget,
  hasOpenTavernKeeperPanel,
  LATEST_CREATOR_DESCRIPTION,
  LATEST_CREATOR_LABEL,
  LATEST_SCANNED_LABEL,
  matchingScanStatus,
  scannedVersionDescription,
  VersionChoiceOption,
} from "./version-choice-option";

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

type VersionChoice = Extract<PreparedInstallTargetChoice, { kind: "choose" }>;

interface InstallVersionChooserProps {
  projectId: string;
  projectName: string;
  anchor: HTMLElement;
  choice: VersionChoice;
  scanStatus?: TavernKeeperCardStatus | null;
  notice?: string | null;
  onSelect(selection: PreparedInstallSelection): void;
  onCancel(): void;
}

export function InstallVersionChooser({
  projectId,
  projectName,
  anchor,
  choice,
  scanStatus = null,
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

  const restoreFocus = useCallback(() => {
    if (anchor.isConnected) anchor.focus({ preventScroll: true });
  }, [anchor]);

  const cancel = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
    restoreFocus();
    queueMicrotask(restoreFocus);
  }, [onCancel, restoreFocus]);

  const select = useCallback(
    (selection: PreparedInstallSelection) => {
      if (settled.current) return;
      settled.current = true;
      restoreFocus();
      onSelect(selection);
    },
    [onSelect, restoreFocus],
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
      if (isVersionChoiceOwnedTarget(surfaceRef.current, target)) return;
      cancel();
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (hasOpenTavernKeeperPanel(projectId)) return;
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
  }, [cancel, choice.checked.disabledReason, projectId]);

  if (typeof document === "undefined") return null;
  const checkedDescription = scannedVersionDescription(choice.checked.selection.target.checkedAt);
  const checkedScanStatus = matchingScanStatus(scanStatus, choice.checked.selection.target);

  return createPortal(
    <div class="tavernary-companion-install-version-chooser-backdrop">
      <section
        ref={surfaceRef}
        class="tavernary-companion-install-version-chooser"
        role="dialog"
        aria-labelledby={headingId}
        data-project-name={projectName}
        style={{ position: "fixed", ...position }}
      >
        <h2 id={headingId}>Choose a version for {projectName}</h2>
        {notice ? (
          <p class="tavernary-companion-install-version-chooser__notice" role="status">
            {notice}
          </p>
        ) : null}
        <VersionChoiceOption
          buttonRef={checkedRef}
          label={LATEST_SCANNED_LABEL}
          description={checkedDescription}
          descriptionId={checkedDescriptionId}
          disabledReason={choice.checked.disabledReason}
          disabledReasonId={checkedDisabledId}
          onSelect={() => select(choice.checked.selection)}
          scan={checkedScanStatus ? { projectId, status: checkedScanStatus } : null}
        />
        <VersionChoiceOption
          buttonRef={newestRef}
          label={LATEST_CREATOR_LABEL}
          description={LATEST_CREATOR_DESCRIPTION}
          descriptionId={newestDescriptionId}
          onSelect={() => select(choice.newest.selection)}
        />
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

export function dispatchPreparedInstallChoice(
  choice: PreparedInstallTargetChoice,
  onInstall: (selection: PreparedInstallSelection) => void,
  onChoose: (choice: VersionChoice) => void,
): void {
  if (choice.kind === "choose") onChoose(choice);
  else onInstall(choice.selection);
}

export function checkedVersionDescription(checkedAt: string): string {
  return scannedVersionDescription(checkedAt);
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
