import type { ProjectCardViewModel } from "../../catalog/project-view-model";
import { ActivityStrip } from "./activity-strip";
import { Tooltip } from "./tooltip";

interface ActivitySummaryProps {
  projectId: string;
  activity: ProjectCardViewModel["activity"];
  tooltip: string;
}

export function ActivitySummary({
  projectId,
  activity,
  tooltip,
}: ActivitySummaryProps): preact.JSX.Element {
  if (activity.activeWeeks12 === null || activity.weeklyActivity === null) {
    return (
      <Tooltip
        id={`${projectId}-activity`}
        label={tooltip}
        ariaLabel={tooltip}
        className="tavernary-companion-development-unavailable"
      >
        No data
      </Tooltip>
    );
  }
  return (
    <Tooltip
      id={`${projectId}-activity`}
      label={tooltip}
      ariaLabel={tooltip}
      className={`tavernary-companion-activity-summary evidence-${activity.evidenceStatus}`}
    >
      <b aria-hidden="true">Activity</b>
      <ActivityStrip weeks={activity.weeklyActivity} />
    </Tooltip>
  );
}
