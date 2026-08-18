import type { ProjectCardViewModel, ProjectPrimaryAction } from "../../catalog/project-view-model";
import { COMPANION_PROJECT_ID } from "../../lifecycle/self-protection";
import { ActivitySummary } from "../shared/activity-summary";
import { AssessmentBadge } from "../shared/assessment-badge";

interface ProjectCardProps {
  project: ProjectCardViewModel;
  onOpen(): void;
  onAction(action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
}

export function ProjectCard({
  project,
  onOpen,
  onAction,
  onManageInSillyTavern,
  lifecycleDisabled = false,
}: ProjectCardProps): preact.JSX.Element {
  const selfProtected =
    project.id === COMPANION_PROJECT_ID || project.action.kind === "current-extension";
  return (
    <article class="tavernary-companion-project-card" data-project-id={project.id}>
      <header>
        <h3>{project.name}</h3>
        <span>{project.frontends.join(", ") || "Frontend-neutral"}</span>
      </header>
      <p class="tavernary-companion-project-card__context">
        {kindLabel(project.kind)} · {project.primaryFunction}
      </p>
      <p class="tavernary-companion-project-card__summary">{project.summary}</p>
      <div class="tavernary-companion-project-card__evidence">
        <ActivitySummary activity={project.activity} />
        <AssessmentBadge status={project.tavernKeeper} />
      </div>
      {project.action.reason ? (
        <p class="tavernary-companion-project-card__reason">{project.action.reason}</p>
      ) : null}
      <footer>
        <button
          type="button"
          data-focus-key={`project-${project.id}`}
          onClick={onOpen}
          aria-label={`View ${project.name}`}
        >
          Details
        </button>
        {selfProtected ? (
          <button type="button" onClick={onManageInSillyTavern}>
            Manage in SillyTavern
          </button>
        ) : (
          <button
            type="button"
            class="tavernary-companion-project-card__primary"
            data-testid="project-primary-action"
            aria-label={`${project.action.label} ${project.name}`}
            onClick={() => onAction(project.action)}
            disabled={lifecycleDisabled}
          >
            {project.action.label}
          </button>
        )}
      </footer>
    </article>
  );
}

function kindLabel(kind: ProjectCardViewModel["kind"]): string {
  return { extension: "Extension", preset: "Preset", frontend: "Frontend" }[kind];
}
