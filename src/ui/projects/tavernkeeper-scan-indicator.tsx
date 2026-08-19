import { useEffect, useRef, useState } from "preact/hooks";

import type { TavernKeeperCardStatus } from "../../catalog/catalog-core";
import { TavernKeeperHistoryStrip } from "./tavernkeeper-history-strip";

const riskLabels = {
  low: "Low concern",
  material: "Material concern",
  high: "Immediate danger",
};

const freshnessLabels = {
  current: "current scan",
  stale: "scan not current",
  unavailable: "freshness unavailable",
  unassessed: "not assessed",
  unsupported: "unsupported source",
};

const dangerBasisLabels = {
  malicious_or_compromised: "Credible malicious or compromised behavior",
  critical_exploitable_vulnerability: "Critical, readily exploitable vulnerability",
  mixed: "Malicious or compromised behavior and an exploitable vulnerability",
};

interface TavernKeeperScanIndicatorProps {
  projectId: string;
  status: TavernKeeperCardStatus;
}

export function TavernKeeperScanIndicator({
  projectId,
  status,
}: TavernKeeperScanIndicatorProps): preact.JSX.Element {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLElement>(null);
  const popoverId = `tavernkeeper-scan-${projectId}`;
  const headingId = `${popoverId}-heading`;
  const report = status.report;

  useEffect(() => {
    if (!open) return;
    const closeFromPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (trigger.current?.contains(target) || popover.current?.contains(target)) return;
      setOpen(false);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", closeFromPointer);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeFromPointer);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [open]);

  return (
    <span class="tavernary-companion-tavernkeeper-control">
      <button
        ref={trigger}
        type="button"
        class={`tavernary-companion-tavernkeeper-trigger state-${status.state}`}
        aria-controls={popoverId}
        aria-expanded={open}
        aria-label={`TavernKeeper scan: ${statusLabel(status)}`}
        title={statusLabel(status)}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <ScanIcon />
        {status.freshness === "stale" ? <ClockIcon /> : null}
      </button>
      {open ? (
        <section
          ref={popover}
          id={popoverId}
          class="tavernary-companion-tavernkeeper-popover"
          role="dialog"
          aria-labelledby={headingId}
          onClick={(event) => event.stopPropagation()}
        >
          <header>
            <h2 id={headingId}>TavernKeeper Scan Results</h2>
            {report ? (
              <span class={`state-${status.state}`}>
                <strong>{riskLabels[report.riskLevel]}</strong>
                <span>{freshnessLabels[status.freshness]}</span>
              </span>
            ) : null}
          </header>
          {report ? (
            <>
              <h3>{report.headline}</h3>
              <p class="tavernary-companion-tavernkeeper-summary">
                {conciseSummary(report.summary)}
                {freshnessNotice(status)}
              </p>
              <p
                class="tavernary-companion-tavernkeeper-counts"
                aria-label="Assessment finding counts"
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
                      aria-label={`Browse scanned source at commit ${report.scannedSha}`}
                      href={report.treeUrl}
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
              <footer>
                <a href={report.reportUrl} rel="noopener noreferrer" target="_blank">
                  View full report<span aria-hidden="true"> ↗</span>
                </a>
                {status.historyUrl ? (
                  <a
                    href={externalTavernaryUrl(status.historyUrl)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View scan history<span aria-hidden="true"> ↗</span>
                  </a>
                ) : null}
              </footer>
            </>
          ) : (
            <p class="tavernary-companion-tavernkeeper-summary">{emptyStateCopy(status)}</p>
          )}
        </section>
      ) : null}
    </span>
  );
}

function statusLabel(status: TavernKeeperCardStatus): string {
  if (!status.report || !status.riskLevel) {
    if (status.freshness === "unsupported") return "Scan unsupported";
    if (status.freshness === "unavailable") return "Scan unavailable";
    return "Not assessed";
  }
  return `${riskLabels[status.riskLevel]} · ${freshnessLabels[status.freshness]}`;
}

function emptyStateCopy(status: TavernKeeperCardStatus): string {
  if (status.freshness === "unsupported") {
    return "TavernKeeper scanning is not supported for this project's source.";
  }
  if (status.freshness === "unavailable") {
    return "Tavernary cannot confirm the repository's current commit, and no completed assessment is available.";
  }
  return "This project hasn't been scanned by TavernKeeper.";
}

function freshnessNotice(status: TavernKeeperCardStatus): string {
  if (status.freshness === "stale") {
    return " This assessment covers an older commit. An updated scan is pending.";
  }
  if (status.freshness === "unavailable") {
    return " Tavernary cannot confirm the repository's current commit, so freshness is unavailable.";
  }
  return "";
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function externalTavernaryUrl(value: string): string {
  return new URL(value, "https://tavernary.org").href;
}

const encodedCitationPattern = /\s*\uE200cite\uE202[^\uE201]*\uE201/giu;
const findingReferencePattern = /\s*\((?:V\d+\s+)?findings?\s+[^)]*\b[0-9a-f]{64}\b[^)]*\)/giu;
const bracketedFindingReferencePattern = /\s*\[[0-9a-f]{64}(?:,\s*[0-9a-f]{64})*\]/giu;
const invisibleFormattingPattern = /[\u200B-\u200D\u2060\uFEFF]/gu;

function conciseSummary(summary: string): string {
  return summary
    .replace(encodedCitationPattern, "")
    .replace(findingReferencePattern, "")
    .replace(bracketedFindingReferencePattern, "")
    .replace(invisibleFormattingPattern, "")
    .replace(/\s+([,.;!?])/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
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
    <svg aria-hidden="true" data-icon="clock" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 7V12L14.5 13.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      />
    </svg>
  );
}
