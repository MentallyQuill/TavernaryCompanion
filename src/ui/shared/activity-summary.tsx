import type { ProjectCardViewModel } from "../../catalog/project-view-model";
import { ActivityStrip } from "./activity-strip";

interface ActivitySummaryProps {
  activity: ProjectCardViewModel["activity"];
}

export function ActivitySummary({ activity }: ActivitySummaryProps): preact.JSX.Element {
  if (activity.activeWeeks12 === null || activity.weeklyActivity === null) {
    return (
      <span
        class="tavernary-companion-development-unavailable"
        role="img"
        aria-label="Activity unavailable"
      >
        No data
      </span>
    );
  }
  const evidence =
    activity.evidenceStatus === "provisional"
      ? ", baseline pending"
      : activity.evidenceStatus === "degraded"
        ? ", evidence incomplete"
        : "";
  const label = `Activity: ${activity.activeWeeks12} of 12 active weeks${evidence}${activity.dormant ? ", dormant" : ""}`;
  return (
    <span
      class={`tavernary-companion-activity-summary evidence-${activity.evidenceStatus}`}
      role="img"
      aria-label={label}
    >
      <b aria-hidden="true">Activity</b>
      <ActivityStrip weeks={activity.weeklyActivity} />
    </span>
  );
}
