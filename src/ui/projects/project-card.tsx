import type { ProjectCardViewModel, ProjectPrimaryAction } from "../../catalog/project-view-model";
import { COMPANION_PROJECT_ID } from "../../lifecycle/self-protection";
import { ActivitySummary } from "../shared/activity-summary";
import { CategoryIcon } from "../shared/category-icon";
import { ProjectKitControl } from "./project-kit-control";
import { ProjectLifecycleControl } from "./project-lifecycle-control";
import { TavernKeeperScanIndicator } from "./tavernkeeper-scan-indicator";

interface ProjectCardProps {
  project: ProjectCardViewModel;
  onAction(action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
  selectedForKit?: boolean;
  onToggleKitSelection?(projectId: string): void;
}

export function ProjectCard({
  project,
  onAction,
  onManageInSillyTavern,
  lifecycleDisabled = false,
  selectedForKit = false,
  onToggleKitSelection,
}: ProjectCardProps): preact.JSX.Element {
  const selfProtected =
    project.id === COMPANION_PROJECT_ID || project.action.kind === "current-extension";
  const iconName = project.kind === "extension" ? project.primaryFunctionId : project.kind;
  const hasActivityMetrics =
    project.activity.activeWeeks12 !== null && project.activity.weeklyActivity !== null;
  return (
    <article
      class={`tavernary-companion-project-card kind-${project.kind}`}
      data-project-id={project.id}
    >
      <header class="tavernary-companion-project-card__top">
        <span
          class="tavernary-companion-project-card__kind"
          aria-label={`${project.primaryFunction} ${kindLabel(project.kind)}`}
        >
          <span class="tavernary-companion-project-card__function-symbol">
            <CategoryIcon name={iconName} />
          </span>
          {kindLabel(project.kind)}
        </span>
        {project.kind === "preset" ? (
          project.preset ? (
            <span class="tavernary-companion-project-card__development is-preset">
              {project.preset.versionLabel ? (
                <b class="tavernary-companion-project-card__preset-version">
                  {project.preset.versionLabel}
                </b>
              ) : null}
              {project.preset.publishedLabel ? (
                <span class="tavernary-companion-project-card__preset-publication">
                  {project.preset.publishedLabel}
                </span>
              ) : null}
              {project.preset.sizeLabel ? (
                <span class="tavernary-companion-project-card__preset-size">
                  {project.preset.sizeLabel}
                </span>
              ) : null}
            </span>
          ) : null
        ) : (
          <span class="tavernary-companion-project-card__development">
            <ActivitySummary activity={project.activity} />
            {hasActivityMetrics && project.activity.latestSourceActivityLabel ? (
              <b
                class="tavernary-companion-project-card__activity-age"
                style={
                  {
                    "--tavernary-companion-commit-freshness": `${project.activity.latestSourceActivityFreshness}%`,
                  } as preact.JSX.CSSProperties
                }
              >
                {project.activity.latestSourceActivityLabel}
              </b>
            ) : hasActivityMetrics ? (
              <b class="tavernary-companion-project-card__activity-age no-source-activity">
                {missingSourceActivityLabel(project.activity.evidenceStatus)}
              </b>
            ) : null}
            {project.communityAggregate !== null ? (
              <span
                class="tavernary-companion-project-card__community"
                aria-label={`Community activity: ${project.communityAggregate}`}
              >
                <CategoryIcon name="community" />
                <b>{project.communityAggregate}</b>
              </span>
            ) : null}
            {project.repositorySizeLabel ? (
              <span class="tavernary-companion-project-card__repository-size">
                {project.repositorySizeLabel}
              </span>
            ) : null}
          </span>
        )}
      </header>
      <div class="tavernary-companion-project-card__title">
        <h3>
          <a
            class="tavernary-companion-project-card__source-link"
            href={project.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-focus-key={`project-${project.id}`}
          >
            {project.displayName}
          </a>
        </h3>
        {project.tavernKeeper ? (
          <TavernKeeperScanIndicator projectId={project.id} status={project.tavernKeeper} />
        ) : null}
      </div>
      {project.attributionLabel ? (
        <p class="tavernary-companion-project-card__attribution">{project.attributionLabel}</p>
      ) : null}
      <p class="tavernary-companion-project-card__summary">{project.summary}</p>
      <div class="tavernary-companion-project-card__bottom">
        <div class="tavernary-companion-project-card__chips">
          {project.frontends.map((frontend) => (
            <span class="tavernary-companion-chip tavernary-companion-chip--frontend">
              {frontend}
            </span>
          ))}
          {project.tagChips.map((tag) => (
            <span class={`tavernary-companion-chip tavernary-companion-chip--tag tag-${tag.facet}`}>
              {tag.label}
            </span>
          ))}
          {project.preset?.modelFamilies.map((family) => (
            <span class="tavernary-companion-chip">{family}</span>
          ))}
          {project.preset?.completionFormats.map((format) => (
            <span class="tavernary-companion-chip">{format}</span>
          ))}
        </div>
        {project.action.reason ? (
          <p class="tavernary-companion-project-card__reason">{project.action.reason}</p>
        ) : null}
        <div class="tavernary-companion-project-card__utility">
          <div class="tavernary-companion-project-card__meta">
            <span class={`tavernary-companion-license license-${project.licenseStatus}`}>
              {project.licenseLabel}
            </span>
            {project.installed ? <span>Installed</span> : null}
          </div>
          <footer>
            {selfProtected ? (
              <button type="button" onClick={onManageInSillyTavern}>
                Manage in SillyTavern
              </button>
            ) : (
              <ProjectLifecycleControl
                projectName={project.displayName}
                action={project.action}
                disabled={lifecycleDisabled}
                onAction={onAction}
              />
            )}
            {!selfProtected && project.kitSelectable && onToggleKitSelection ? (
              <ProjectKitControl
                projectId={project.id}
                projectName={project.displayName}
                selected={selectedForKit}
                onToggle={onToggleKitSelection}
              />
            ) : null}
          </footer>
        </div>
      </div>
    </article>
  );
}

function kindLabel(kind: ProjectCardViewModel["kind"]): string {
  return { extension: "Extension", preset: "System Preset", frontend: "Frontend" }[kind];
}

function missingSourceActivityLabel(
  evidenceStatus: ProjectCardViewModel["activity"]["evidenceStatus"],
): string {
  return { complete: "Quiet", provisional: "Pending", degraded: "Partial" }[evidenceStatus];
}
