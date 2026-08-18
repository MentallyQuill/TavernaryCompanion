import type { ProjectCardViewModel, ProjectPrimaryAction } from "../../catalog/project-view-model";
import { useEffect, useState } from "preact/hooks";
import { ProjectCard } from "./project-card";

const PROJECT_BATCH_SIZE = 30;

interface ProjectGridProps {
  projects: ProjectCardViewModel[];
  onOpenProject(id: string): void;
  onProjectAction(id: string, action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
  kitSelectionActive?: boolean;
  selectedKitProjectIds?: readonly string[];
  onToggleKitSelection?(projectId: string): void;
}

export function ProjectGrid({
  projects,
  onOpenProject,
  onProjectAction,
  onManageInSillyTavern,
  lifecycleDisabled,
  kitSelectionActive = false,
  selectedKitProjectIds = [],
  onToggleKitSelection,
}: ProjectGridProps): preact.JSX.Element {
  const [visibleCount, setVisibleCount] = useState(PROJECT_BATCH_SIZE);
  useEffect(() => setVisibleCount(PROJECT_BATCH_SIZE), [projects]);
  if (projects.length === 0) {
    return <p>No projects match the current filters.</p>;
  }
  return (
    <section class="tavernary-companion-project-results" aria-label="Project results">
      <div class="tavernary-companion-project-grid">
        {projects.slice(0, visibleCount).map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={() => onOpenProject(project.id)}
            onAction={(action) => onProjectAction(project.id, action)}
            onManageInSillyTavern={onManageInSillyTavern}
            lifecycleDisabled={lifecycleDisabled}
            kitSelectionActive={kitSelectionActive}
            selectedForKit={selectedKitProjectIds.includes(project.id)}
            onToggleKitSelection={onToggleKitSelection}
          />
        ))}
      </div>
      {visibleCount < projects.length ? (
        <button
          type="button"
          class="tavernary-companion-project-results__more tavernary-companion-button tavernary-companion-button--secondary"
          aria-label="Show more projects"
          onClick={() => setVisibleCount((current) => current + PROJECT_BATCH_SIZE)}
        >
          Show more
        </button>
      ) : null}
    </section>
  );
}
