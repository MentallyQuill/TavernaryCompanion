import type { ProjectCardViewModel } from "../../catalog/project-view-model";

interface ActivitySummaryProps {
  activity: ProjectCardViewModel["activity"];
}

export function ActivitySummary({ activity }: ActivitySummaryProps): preact.JSX.Element {
  if (activity.activeWeeks12 === null) {
    return <span>Activity unavailable</span>;
  }
  return (
    <span>
      {activity.activeWeeks12} of 12 active weeks{activity.dormant ? " · Dormant" : ""}
    </span>
  );
}
