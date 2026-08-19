import type { ProjectCardViewModel } from "../../catalog/project-view-model";

interface AssessmentBadgeProps {
  status: ProjectCardViewModel["tavernKeeper"];
}

export function AssessmentBadge({ status }: AssessmentBadgeProps): preact.JSX.Element {
  if (!status || status.freshness === "unassessed") {
    return <span class="tavernary-companion-assessment is-neutral">Not assessed</span>;
  }
  if (status.freshness === "unsupported") {
    return <span class="tavernary-companion-assessment is-neutral">Scan unsupported</span>;
  }
  if (!status.riskLevel) {
    return <span class="tavernary-companion-assessment is-neutral">Scan unavailable</span>;
  }
  const concern = {
    low: "Low concern",
    material: "Potential concerns",
    high: "High concern",
  }[status.riskLevel];
  const freshness = status.freshness === "current" ? "current scan" : "scan not current";
  return (
    <span class={`tavernary-companion-assessment is-${status.state}`}>
      {concern} · {freshness}
    </span>
  );
}
