import type { TavernKeeperReportSummary } from "../../catalog/catalog-core";

export const observedRiskLabels = {
  low: "Low concern observed",
  material: "Material concern observed",
  high: "Immediate danger observed",
} as const;

const coverageLabels = {
  complete: "JavaScript/TypeScript scan complete",
  incomplete: "Scan incomplete",
  legacy: "Coverage not recorded",
  unavailable: "Coverage unavailable in cached catalog",
} as const;

const coverageAccessibleLabels = {
  complete: "JavaScript/TypeScript scan complete",
  incomplete: "scan incomplete",
  legacy: "coverage not recorded",
  unavailable: "coverage unavailable in cached catalog",
} as const;

export type TavernKeeperCoverageKind = keyof typeof coverageLabels;

export interface TavernKeeperCoveragePresentation {
  kind: TavernKeeperCoverageKind;
  label: string;
  accessibleLabel: string;
  explanation: string | null;
}

export function tavernKeeperCoverage(
  report: TavernKeeperReportSummary,
): TavernKeeperCoveragePresentation {
  const kind = report.javascriptAnalysisStatus ?? "unavailable";
  const label = coverageLabels[kind];
  const explanation =
    kind === "incomplete"
      ? `TavernKeeper found ${observedRiskLabels[report.riskLevel].toLowerCase().replace(" observed", "")} in the code it analyzed. Parts of the JavaScript/TypeScript scan were incomplete, so this is not a complete result.`
      : null;
  return {
    kind,
    label,
    accessibleLabel: coverageAccessibleLabels[kind],
    explanation,
  };
}
