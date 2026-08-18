import type { ProjectDetailViewModel } from "../../catalog/project-view-model";
import { ActivitySummary } from "../shared/activity-summary";
import { AssessmentBadge } from "../shared/assessment-badge";

interface ProjectEvidenceProps {
  project: ProjectDetailViewModel;
}

export function ProjectEvidence({ project }: ProjectEvidenceProps): preact.JSX.Element {
  const report = project.tavernKeeper?.report;
  return (
    <section class="tavernary-companion-project-evidence" aria-labelledby="project-assessment">
      <h3 id="project-assessment">TavernKeeper assessment</h3>
      <AssessmentBadge status={project.tavernKeeper} />
      {report ? (
        <>
          <h4>{report.headline}</h4>
          <p>{report.summary}</p>
          <dl>
            <div>
              <dt>Minor cautions</dt>
              <dd>{report.minorCautions}</dd>
            </div>
            <div>
              <dt>Material concerns</dt>
              <dd>{report.materialConcerns}</dd>
            </div>
            <div>
              <dt>High danger findings</dt>
              <dd>{report.highDanger}</dd>
            </div>
            <div>
              <dt>Scanned commit</dt>
              <dd>{report.scannedSha.slice(0, 12)}</dd>
            </div>
          </dl>
          <a href={report.reportUrl} target="_blank" rel="noreferrer noopener">
            Open Scan Review (new tab)
          </a>
        </>
      ) : (
        <p>No current TavernKeeper assessment is available.</p>
      )}
      <h3>Activity evidence</h3>
      <ActivitySummary activity={project.activity} />
      {project.activity.latestSourceActivityAt ? (
        <p>Latest source activity: {formatDate(project.activity.latestSourceActivityAt)}</p>
      ) : null}
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
