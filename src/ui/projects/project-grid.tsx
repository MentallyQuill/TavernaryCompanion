import type { ProjectCardViewModel, ProjectPrimaryAction } from "../../catalog/project-view-model";
import { useEffect, useState } from "preact/hooks";
import { ProjectCard } from "./project-card";

const PROJECT_BATCH_SIZE = 60;

interface ProjectGridProps {
  projects: ProjectCardViewModel[];
  density?: "standard" | "compact";
  onProjectAction(id: string, action: ProjectPrimaryAction, anchor: HTMLButtonElement): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
  selectedKitProjectIds?: readonly string[];
  onToggleKitSelection?(projectId: string): void;
  visibleCount?: number;
  onVisibleCountChange?(count: number): void;
}

export function ProjectGrid({
  projects,
  density = "standard",
  onProjectAction,
  onManageInSillyTavern,
  lifecycleDisabled,
  selectedKitProjectIds = [],
  onToggleKitSelection,
  visibleCount: controlledVisibleCount,
  onVisibleCountChange,
}: ProjectGridProps): preact.JSX.Element {
  const [internalVisibleCount, setInternalVisibleCount] = useState(PROJECT_BATCH_SIZE);
  const visibleCount = controlledVisibleCount ?? internalVisibleCount;
  useEffect(() => {
    if (controlledVisibleCount === undefined) setInternalVisibleCount(PROJECT_BATCH_SIZE);
  }, [projects, controlledVisibleCount]);
  const showMore = () => {
    const next = visibleCount + PROJECT_BATCH_SIZE;
    if (onVisibleCountChange) onVisibleCountChange(next);
    else setInternalVisibleCount(next);
  };
  if (projects.length === 0) {
    return <p>No projects match the current filters.</p>;
  }
  return (
    <section
      class={`tavernary-companion-project-results${density === "compact" ? " is-compact" : ""}`}
      aria-label="Project results"
    >
      <div class="tavernary-companion-project-grid">
        {projects.slice(0, visibleCount).map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onAction={(action, anchor) => onProjectAction(project.id, action, anchor)}
            onManageInSillyTavern={onManageInSillyTavern}
            lifecycleDisabled={lifecycleDisabled}
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
          onClick={showMore}
        >
          Show more
        </button>
      ) : null}
    </section>
  );
}
