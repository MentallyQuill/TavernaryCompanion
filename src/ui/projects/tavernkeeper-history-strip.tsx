import type { TavernKeeperReportSummary } from "../../catalog/catalog-core";
import { observedRiskLabels, tavernKeeperCoverage } from "./tavernkeeper-coverage";

export function TavernKeeperHistoryStrip({
  history,
}: {
  history: readonly TavernKeeperReportSummary[];
}): preact.JSX.Element | null {
  const conclusions = history.slice(-12);
  if (conclusions.length < 2) return null;
  return (
    <span
      class="tavernary-companion-tavernkeeper-history"
      role="group"
      aria-label="Recent TavernKeeper scan history"
    >
      {conclusions.map((conclusion) => {
        const coverage = tavernKeeperCoverage(conclusion);
        const label =
          `TavernKeeper scan history: ${observedRiskLabels[conclusion.riskLevel].toLowerCase()}; ` +
          `${coverage.accessibleLabel} ` +
          `on ${formatDate(conclusion.assessedAt)} at commit ` +
          `${conclusion.scannedSha.slice(0, 7)} under policy ${conclusion.scannerPolicyVersion}`;
        return (
          <a
            key={conclusion.reportId}
            aria-label={`Open TavernKeeper report for ${label}`}
            href={conclusion.reportUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <i
              class={`risk-${conclusion.riskLevel} coverage-${coverage.kind}`}
              role="img"
              aria-label={label}
            />
          </a>
        );
      })}
    </span>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}
