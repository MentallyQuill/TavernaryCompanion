import type { ProjectCardViewModel } from "../../catalog/project-view-model";
import { ActivityStrip } from "./activity-strip";

interface ActivitySummaryProps {
  activity: ProjectCardViewModel["activity"];
}

export function ActivitySummary({ activity }: ActivitySummaryProps): preact.JSX.Element {
  if (activity.activeWeeks12 === null) {
    return <span>Activity unavailable</span>;
  }
  const label = `Activity: ${activity.activeWeeks12} of 12 active weeks${
    activity.dormant ? ", dormant" : ""
  }`;
  return (
    <span class="tavernary-companion-activity-summary" aria-label={label}>
      <b aria-hidden="true">Activity</b>
      <ActivityStrip weeks={activity.weeklyActivity} />
    </span>
  );
}
