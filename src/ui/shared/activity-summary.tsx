import type { ProjectCardViewModel } from "../../catalog/project-view-model";
import { ActivityStrip } from "./activity-strip";

interface ActivitySummaryProps {
  activity: ProjectCardViewModel["activity"];
}

export function ActivitySummary({ activity }: ActivitySummaryProps): preact.JSX.Element {
  if (activity.activeWeeks12 === null) {
    return <span>Activity unavailable</span>;
  }
  return (
    <span class="tavernary-companion-activity-summary">
      <span>
        <b>Activity</b> ·{" "}
        <span>
          {activity.activeWeeks12} of 12 active weeks{activity.dormant ? " · Dormant" : ""}
        </span>
      </span>
      <ActivityStrip weeks={activity.weeklyActivity} />
    </span>
  );
}
