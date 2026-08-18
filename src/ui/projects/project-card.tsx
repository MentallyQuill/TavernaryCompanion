import type { ProjectCardViewModel, ProjectPrimaryAction } from "../../catalog/project-view-model";
import { COMPANION_PROJECT_ID } from "../../lifecycle/self-protection";
import { ActivitySummary } from "../shared/activity-summary";
import { AssessmentBadge } from "../shared/assessment-badge";
import { CategoryIcon } from "../shared/category-icon";

interface ProjectCardProps {
  project: ProjectCardViewModel;
  onOpen(): void;
  onAction(action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
  kitSelectionActive?: boolean;
  selectedForKit?: boolean;
  onToggleKitSelection?(projectId: string): void;
}

export function ProjectCard({
  project,
  onOpen,
  onAction,
  onManageInSillyTavern,
  lifecycleDisabled = false,
  kitSelectionActive = false,
  selectedForKit = false,
  onToggleKitSelection,
}: ProjectCardProps): preact.JSX.Element {
  const selfProtected =
    project.id === COMPANION_PROJECT_ID || project.action.kind === "current-extension";
  return (
    <article class="tavernary-companion-project-card" data-project-id={project.id}>
      <header class="tavernary-companion-project-card__top">
        <span class={`tavernary-companion-project-card__kind kind-${project.kind}`}>
          <CategoryIcon kind={project.kind} />
          {kindLabel(project.kind)}
        </span>
        <ActivitySummary activity={project.activity} />
      </header>
      <div class="tavernary-companion-project-card__title">
        <h3>{project.name}</h3>
        <AssessmentBadge status={project.tavernKeeper} />
      </div>
      <p class="tavernary-companion-project-card__summary">{project.summary}</p>
      <div class="tavernary-companion-project-card__chips">
        {(project.frontends.length ? project.frontends : ["Frontend-neutral"]).map((frontend) => (
          <span class="tavernary-companion-chip tavernary-companion-chip--frontend">
            {frontend}
          </span>
        ))}
        <span class="tavernary-companion-chip tavernary-companion-chip--function">
          {project.primaryFunction}
        </span>
        {project.tags.slice(0, 3).map((tag) => (
          <span class="tavernary-companion-chip">{tag}</span>
        ))}
      </div>
      <div class="tavernary-companion-project-card__meta">
        <span>{project.licenseLabel}</span>
        {project.installed ? <span>Installed</span> : null}
      </div>
      {project.action.reason ? (
        <p class="tavernary-companion-project-card__reason">{project.action.reason}</p>
      ) : null}
      <footer>
        {kitSelectionActive && !selfProtected && project.kitSelectable ? (
          <button type="button" onClick={() => onToggleKitSelection?.(project.id)}>
            {selectedForKit ? "Remove from Kit" : "Add to Kit"}
          </button>
        ) : null}
        <button
          class="tavernary-companion-button tavernary-companion-button--secondary"
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
            class="tavernary-companion-project-card__primary tavernary-companion-button tavernary-companion-button--primary"
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
