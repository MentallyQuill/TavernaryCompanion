import type { ProjectCardViewModel } from "../../catalog/project-view-model";

interface AssessmentBadgeProps {
  status: ProjectCardViewModel["tavernKeeper"];
  compact?: boolean;
}

export function AssessmentBadge({
  status,
  compact = false,
}: AssessmentBadgeProps): preact.JSX.Element {
  const label = assessmentLabel(status);
  const state = status?.state ?? "neutral";
  if (compact) {
    return (
      <span
        class={`tavernary-companion-assessment tavernary-companion-assessment--compact is-${state}`}
        role="img"
        aria-label={`TavernKeeper scan: ${label}`}
        title={label}
      >
        <svg aria-hidden="true" data-icon="scan-fill" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.257 5.671l2.137 2.137a7 7 0 1 0 1.414-1.414L5.67 4.257A9.959 9.959 0 0 1 12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12c0-2.401.846-4.605 2.257-6.329zm3.571 3.572L12 13.414 13.414 12 9.243 7.828a5 5 0 1 1-1.414 1.414z" />
        </svg>
      </span>
    );
  }
  return <span class={`tavernary-companion-assessment is-${state}`}>{label}</span>;
}

function assessmentLabel(status: ProjectCardViewModel["tavernKeeper"]): string {
  if (!status || status.freshness === "unassessed") return "Not assessed";
  if (status.freshness === "unsupported") return "Scan unsupported";
  if (!status.riskLevel) return "Scan unavailable";
  const concern = {
    low: "Low concern",
    material: "Potential concerns",
    high: "High concern",
  }[status.riskLevel];
  const freshness = status.freshness === "current" ? "current scan" : "scan not current";
  return `${concern} · ${freshness}`;
}
