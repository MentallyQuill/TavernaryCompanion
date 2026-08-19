import { createPortal } from "preact/compat";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import type { TavernKeeperCardStatus } from "../../catalog/catalog-core";
import { resolveOverlayPortalTarget } from "../shared/overlay-portal";
import { TavernKeeperHistoryStrip } from "./tavernkeeper-history-strip";

const encodedCitationPattern = /\s*\uE200cite\uE202[^\uE201]*\uE201/giu;
const findingReferencePattern = /\s*\((?:V\d+\s+)?findings?\s+[^)]*\b[0-9a-f]{64}\b[^)]*\)/giu;
const bracketedFindingReferencePattern = /\s*\[[0-9a-f]{64}(?:,\s*[0-9a-f]{64})*\]/giu;
const danglingFindingReferencePattern = /\s*\[(?=[0-9a-f]{64}(?:,|$))[\s\S]*$/iu;
const bareFindingReferencePattern = /(?:Findings:\s*)?(?:\[|\(|【)?[0-9a-f]{64}\b(?:\]|\)|】)?/giu;
const invisibleFormattingPattern = /[\u200B-\u200D\u2060\uFEFF]/gu;

function conciseAssessmentSummary(summary: string): string {
  const withoutArtifacts = summary
    .replace(encodedCitationPattern, "")
    .replace(findingReferencePattern, "")
    .replace(bracketedFindingReferencePattern, "")
    .replace(danglingFindingReferencePattern, "")
    .replace(bareFindingReferencePattern, "")
    .replace(invisibleFormattingPattern, "");
  let display = withoutArtifacts
    .replace(/\s+([,.;!?])/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();

  if (withoutArtifacts !== summary && !/[.!?]["')\]]?$/u.test(display)) {
    const lastCompleteSentence = Math.max(
      display.lastIndexOf("."),
      display.lastIndexOf("!"),
      display.lastIndexOf("?"),
    );
    if (lastCompleteSentence >= 0) display = display.slice(0, lastCompleteSentence + 1);
    else if (display) display += ".";
  }
  return display;
}

function stateCopy(status: TavernKeeperCardStatus): string {
  if (status.report) {
    const freshness =
      status.freshness === "stale"
        ? " This assessment covers an older commit. An updated scan is pending."
        : status.freshness === "unavailable"
          ? " Tavernary cannot confirm the repository's current commit, so freshness is unavailable."
          : "";
    return `${conciseAssessmentSummary(status.report.summary)}${freshness}`;
  }
  if (status.state === "unsupported") {
    return "TavernKeeper scanning is not supported for this project's source.";
  }
  if (status.freshness === "unavailable") {
    return "Tavernary cannot confirm the repository's current commit, and no completed assessment is available.";
  }
  return "This project hasn't been scanned by TavernKeeper.";
}

const freshnessLabels = {
  current: "current",
  stale: "stale assessment",
  unavailable: "freshness unavailable",
  unassessed: "not assessed",
  unsupported: "unsupported source",
};
const riskGradeLabels = {
  low: "Low concern",
  material: "Material concern",
  high: "Immediate danger",
};
const dangerBasisLabels = {
  malicious_or_compromised: "Credible malicious or compromised behavior",
  critical_exploitable_vulnerability: "Critical, readily exploitable vulnerability",
  mixed: "Malicious or compromised behavior and an exploitable vulnerability",
};

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function accessibleStatus(status: TavernKeeperCardStatus): string {
  if (!status.report) {
    if (status.freshness === "unsupported") return "Unsupported source.";
    if (status.freshness === "unavailable") return "Not assessed; freshness unavailable.";
    return "Not assessed.";
  }
  return `${riskGradeLabels[status.report.riskLevel]}; ${freshnessLabels[status.freshness]}.`;
}

const CLOSE_DELAY = 150;
const VIEWPORT_MARGIN = 8;
const POPOVER_GAP = 8;

let activeDismiss: (() => void) | null = null;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
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

function popoverPosition(trigger: DOMRect, popover: DOMRect): preact.JSX.CSSProperties {
  const viewport = viewportBounds();
  const left = clamp(
    trigger.left + trigger.width / 2 - popover.width / 2,
    viewport.left + VIEWPORT_MARGIN,
    viewport.left + viewport.width - popover.width - VIEWPORT_MARGIN,
  );
  const above = trigger.top - popover.height - POPOVER_GAP;
  const below = trigger.bottom + POPOVER_GAP;
  const top = clamp(
    above >= viewport.top + VIEWPORT_MARGIN ? above : below,
    viewport.top + VIEWPORT_MARGIN,
    viewport.top + viewport.height - popover.height - VIEWPORT_MARGIN,
  );
  return { left, top };
}

function formatDate(scannedAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(scannedAt));
}

interface TavernKeeperScanIndicatorProps {
  projectId: string;
  status: TavernKeeperCardStatus;
}

export function TavernKeeperScanIndicator({
  projectId,
  status,
}: TavernKeeperScanIndicatorProps): preact.JSX.Element {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<preact.JSX.CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerOpenState = useRef<boolean | null>(null);
  const content = stateCopy(status);
  const report = status.report;
  const popoverId = `tavernkeeper-scan-${projectId}`;
  const headingId = `${popoverId}-heading`;

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closePopover = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
    setPosition(null);
  }, [clearCloseTimer]);

  const openPopover = useCallback(() => {
    clearCloseTimer();
    if (activeDismiss && activeDismiss !== closePopover) activeDismiss();
    setOpen(true);
  }, [clearCloseTimer, closePopover]);

  const delayClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(closePopover, CLOSE_DELAY);
  }, [clearCloseTimer, closePopover]);

  const openFromPointer = useCallback(
    (event: preact.JSX.TargetedPointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch") openPopover();
    },
    [openPopover],
  );

  const delayCloseFromPointer = useCallback(
    (event: preact.JSX.TargetedPointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch") delayClose();
    },
    [delayClose],
  );

  const rememberPointerOpenState = useCallback(
    (event: preact.JSX.TargetedPointerEvent<HTMLButtonElement>) => {
      pointerOpenState.current = event.pointerType === "touch" ? open : null;
    },
    [open],
  );

  const togglePopover = useCallback(() => {
    const wasOpenBeforePointerFocus = pointerOpenState.current;
    pointerOpenState.current = null;
    if (wasOpenBeforePointerFocus === true) closePopover();
    else openPopover();
  }, [closePopover, openPopover]);

  const containsInteractiveElement = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Node)) return false;
    return Boolean(triggerRef.current?.contains(target) || popoverRef.current?.contains(target));
  }, []);

  const closeOnFocusExit = useCallback(
    (event: preact.JSX.TargetedFocusEvent<HTMLElement>) => {
      if (!containsInteractiveElement(event.relatedTarget)) closePopover();
    },
    [closePopover, containsInteractiveElement],
  );

  const focusFirstLink = useCallback(
    (event: preact.JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Tab" || event.shiftKey || !open || !firstLinkRef.current) return;
      event.preventDefault();
      firstLinkRef.current.focus();
    },
    [open],
  );

  const focusTrigger = useCallback((event: preact.JSX.TargetedKeyboardEvent<HTMLAnchorElement>) => {
    if (event.key !== "Tab" || !event.shiftKey) return;
    event.preventDefault();
    triggerRef.current?.focus();
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;
    setPosition(
      popoverPosition(
        triggerRef.current.getBoundingClientRect(),
        popoverRef.current.getBoundingClientRect(),
      ),
    );
  }, []);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;
    activeDismiss = closePopover;
    return () => {
      if (activeDismiss === closePopover) activeDismiss = null;
    };
  }, [closePopover, open]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const dismissOnPointerDown = (event: PointerEvent) => {
      if (!containsInteractiveElement(event.target)) closePopover();
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        closePopover();
        triggerRef.current?.focus();
      }
    };
    const dismissOnFocus = (event: FocusEvent) => {
      if (!containsInteractiveElement(event.target)) closePopover();
    };
    document.addEventListener("pointerdown", dismissOnPointerDown);
    document.addEventListener("keydown", dismissOnEscape, true);
    document.addEventListener("focusin", dismissOnFocus);
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointerDown);
      document.removeEventListener("keydown", dismissOnEscape, true);
      document.removeEventListener("focusin", dismissOnFocus);
    };
  }, [closePopover, containsInteractiveElement, open]);

  return (
    <>
      <button
        aria-controls={popoverId}
        aria-expanded={open}
        aria-label={`TavernKeeper scan: ${accessibleStatus(status)}`}
        class={`tavernary-companion-tavernkeeper-trigger state-${status.state}`}
        onBlur={closeOnFocusExit}
        onClick={togglePopover}
        onFocus={openPopover}
        onKeyDown={focusFirstLink}
        onPointerDown={rememberPointerOpenState}
        onPointerEnter={openFromPointer}
        onPointerLeave={delayCloseFromPointer}
        ref={triggerRef}
        type="button"
      >
        <ScanIcon />
        {status.freshness === "stale" ? <ClockIcon /> : null}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <section
              aria-labelledby={headingId}
              class="tavernary-companion-tavernkeeper-popover"
              id={popoverId}
              onBlurCapture={closeOnFocusExit}
              onFocusCapture={openPopover}
              onPointerEnter={openFromPointer}
              onPointerLeave={delayCloseFromPointer}
              ref={popoverRef}
              role="dialog"
              style={{
                ...position,
                visibility: position ? "visible" : "hidden",
              }}
            >
              <header class="tavernary-companion-tavernkeeper-popover__header">
                <h2 id={headingId}>TavernKeeper Scan Results</h2>
                {report ? (
                  <span
                    class={`tavernary-companion-tavernkeeper-popover__status state-${status.state}`}
                  >
                    <strong>{riskGradeLabels[report.riskLevel]}</strong>
                    <span>{freshnessLabels[status.freshness]}</span>
                  </span>
                ) : null}
              </header>
              {report ? (
                <>
                  <p class="tavernary-companion-tavernkeeper-summary">{content}</p>
                  <p
                    aria-label="Assessment finding counts"
                    class="tavernary-companion-tavernkeeper-counts"
                  >
                    <span>{countLabel(report.minorCautions, "minor caution")}</span>
                    <span>{countLabel(report.materialConcerns, "material concern")}</span>
                    <span>{countLabel(report.highDanger, "high-danger finding")}</span>
                  </p>
                  <dl class="tavernary-companion-tavernkeeper-details">
                    {report.riskLevel === "high" && report.dangerBasis !== "none" ? (
                      <div>
                        <dt>Danger basis</dt>
                        <dd>{dangerBasisLabels[report.dangerBasis]}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Scanned</dt>
                      <dd>
                        <time dateTime={report.scannedAt}>{formatDate(report.scannedAt)}</time>
                        <span aria-hidden="true"> · </span>
                        <a
                          aria-label={`Browse scanned source at commit ${report.scannedSha} on GitHub`}
                          href={report.treeUrl}
                          onKeyDown={focusTrigger}
                          ref={firstLinkRef}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {report.scannedSha.slice(0, 7)}
                          <span aria-hidden="true"> ↗</span>
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt>Assessed</dt>
                      <dd>
                        <time dateTime={report.assessedAt}>{formatDate(report.assessedAt)}</time>
                        {" by Tavernary"}
                      </dd>
                    </div>
                  </dl>
                  {status.history.length >= 2 ? (
                    <div class="tavernary-companion-tavernkeeper-recent">
                      <span>Recent scans</span>
                      <TavernKeeperHistoryStrip history={status.history} />
                    </div>
                  ) : null}
                  <footer class="tavernary-companion-tavernkeeper-actions">
                    <a href={report.reportUrl} rel="noopener noreferrer" target="_blank">
                      View full report<span aria-hidden="true"> ↗</span>
                    </a>
                    {status.historyUrl ? (
                      <a
                        href={externalTavernaryUrl(status.historyUrl)}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View scan history<span aria-hidden="true"> →</span>
                      </a>
                    ) : null}
                  </footer>
                </>
              ) : (
                <p class="tavernary-companion-tavernkeeper-summary">{content}</p>
              )}
            </section>,
            resolveOverlayPortalTarget(triggerRef.current),
          )
        : null}
    </>
  );
}

function externalTavernaryUrl(value: string): string {
  return new URL(value, "https://tavernary.org").href;
}

function ScanIcon(): preact.JSX.Element {
  return (
    <svg aria-hidden="true" data-icon="scan-fill" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4.257 5.671l2.137 2.137a7 7 0 1 0 1.414-1.414L5.67 4.257A9.959 9.959 0 0 1 12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12c0-2.401.846-4.605 2.257-6.329zm3.571 3.572L12 13.414 13.414 12 9.243 7.828a5 5 0 1 1-1.414 1.414z" />
    </svg>
  );
}

function ClockIcon(): preact.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      class="tavernary-companion-tavernkeeper-freshness-clock"
      data-icon="clock"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 7V12L14.5 13.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      />
    </svg>
  );
}
