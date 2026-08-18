import type { ProjectCardViewModel, ProjectPrimaryAction } from "../../catalog/project-view-model";
import { ProjectCard } from "./project-card";

interface ProjectGridProps {
  projects: ProjectCardViewModel[];
  onOpenProject(id: string): void;
  onProjectAction(id: string, action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
}

export function ProjectGrid({
  projects,
  onOpenProject,
  onProjectAction,
  onManageInSillyTavern,
  lifecycleDisabled,
}: ProjectGridProps): preact.JSX.Element {
  if (projects.length === 0) {
    return <p>No projects match the current filters.</p>;
  }
  return (
    <div class="tavernary-companion-project-grid" aria-label="Project results">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={() => onOpenProject(project.id)}
          onAction={(action) => onProjectAction(project.id, action)}
          onManageInSillyTavern={onManageInSillyTavern}
          lifecycleDisabled={lifecycleDisabled}
        />
      ))}
    </div>
  );
}
