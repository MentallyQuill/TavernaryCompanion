import type { ProjectCardViewModel, ProjectPrimaryAction } from "../../catalog/project-view-model";
import { COMPANION_PROJECT_ID } from "../../lifecycle/self-protection";
import { ActivitySummary } from "../shared/activity-summary";
import { CategoryIcon } from "../shared/category-icon";
import { Tooltip } from "../shared/tooltip";
import { ProjectKitControl } from "./project-kit-control";
import { ProjectLifecycleControl } from "./project-lifecycle-control";
import { TavernKeeperScanIndicator } from "./tavernkeeper-scan-indicator";

interface ProjectCardProps {
  project: ProjectCardViewModel;
  onAction(action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  density?: "standard" | "compact";
  lifecycleDisabled?: boolean;
  selectedForKit?: boolean;
  onToggleKitSelection?(projectId: string): void;
}

export function ProjectCard({
  project,
  onAction,
  onManageInSillyTavern,
  density = "standard",
  lifecycleDisabled = false,
  selectedForKit = false,
  onToggleKitSelection,
}: ProjectCardProps): preact.JSX.Element {
  const selfProtected =
    project.id === COMPANION_PROJECT_ID || project.action.kind === "current-extension";
  const managedInSillyTavern = selfProtected || project.action.kind === "manage-in-sillytavern";
  const iconName = project.kind === "extension" ? project.primaryFunctionId : project.kind;
  const hasActivityMetrics =
    project.activity.activeWeeks12 !== null && project.activity.weeklyActivity !== null;

  const openRepositoryFromExposedContent = (event: preact.JSX.TargetedMouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a, button")) return;
    const opened = window.open(project.canonicalUrl, "_blank", "noopener,noreferrer");
    if (opened) opened.opener = null;
  };

  return (
    <article
      class={`tavernary-companion-project-card kind-${project.kind}${project.installed ? " is-installed" : ""}`}
      data-project-id={project.id}
      onClick={openRepositoryFromExposedContent}
    >
      <a
        class="tavernary-companion-project-card__hitarea"
        href={project.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${project.displayName} repository`}
        data-focus-key={`project-${project.id}`}
      >
        <span class="tavernary-companion-sr-only">Open {project.displayName} repository</span>
      </a>
      <header class="tavernary-companion-project-card__top">
        <Tooltip
          id={`${project.id}-type`}
          label={project.tooltips.type}
          className="tavernary-companion-project-card__kind"
        >
          <span class="tavernary-companion-project-card__function-symbol">
            <CategoryIcon name={iconName} />
          </span>
          {kindLabel(project.kind)}
        </Tooltip>
        {project.kind === "preset" ? (
          project.preset ? (
            <span class="tavernary-companion-project-card__development is-preset">
              {project.preset.versionLabel ? (
                <Tooltip
                  id={`${project.id}-preset-version`}
                  label={project.tooltips.preset?.version ?? ""}
                  className="tavernary-companion-project-card__preset-version"
                >
                  {project.preset.versionLabel}
                </Tooltip>
              ) : null}
              {project.preset.publishedLabel ? (
                <Tooltip
                  id={`${project.id}-preset-publication`}
                  label={project.tooltips.preset?.published ?? ""}
                  className="tavernary-companion-project-card__preset-publication"
                >
                  {project.preset.publishedLabel}
                </Tooltip>
              ) : null}
              {project.preset.sizeLabel ? (
                <Tooltip
                  id={`${project.id}-preset-size`}
                  label={project.tooltips.preset?.size ?? ""}
                  className="tavernary-companion-project-card__preset-size"
                >
                  {project.preset.sizeLabel}
                </Tooltip>
              ) : null}
            </span>
          ) : null
        ) : (
          <span class="tavernary-companion-project-card__development">
            <ActivitySummary
              projectId={project.id}
              activity={project.activity}
              tooltip={project.tooltips.activity}
            />
            {hasActivityMetrics && project.activity.latestSourceActivityLabel ? (
              <Tooltip
                id={`${project.id}-commit`}
                label={project.tooltips.latestSourceActivity ?? ""}
                className="tavernary-companion-project-card__activity-age"
                style={
                  {
                    "--tavernary-companion-commit-freshness": `${project.activity.latestSourceActivityFreshness}%`,
                  } as preact.JSX.CSSProperties
                }
              >
                {project.activity.latestSourceActivityLabel}
              </Tooltip>
            ) : hasActivityMetrics ? (
              <Tooltip
                id={`${project.id}-commit`}
                label={project.tooltips.latestSourceActivity ?? ""}
                ariaLabel={project.tooltips.latestSourceActivity ?? undefined}
                className="tavernary-companion-project-card__activity-age no-source-activity"
              >
                {missingSourceActivityLabel(project.activity.evidenceStatus)}
              </Tooltip>
            ) : null}
            {project.communityAggregate !== null ? (
              <Tooltip
                id={`${project.id}-community`}
                label={project.tooltips.community ?? ""}
                className="tavernary-companion-project-card__community"
              >
                <CategoryIcon name="community" />
                <b>{project.communityAggregate}</b>
              </Tooltip>
            ) : null}
            {project.repositorySizeLabel ? (
              <Tooltip
                id={`${project.id}-repository-size`}
                label={project.tooltips.repositorySize ?? ""}
                className="tavernary-companion-project-card__repository-size"
              >
                {project.repositorySizeLabel}
              </Tooltip>
            ) : null}
          </span>
        )}
      </header>
      <div class="tavernary-companion-project-card__title">
        <h3>
          {density === "compact" ? (
            <Tooltip
              id={`${project.id}-title`}
              label={project.summary}
              className="tavernary-companion-project-card__title-text"
              showOnAncestorFocus
            >
              {project.displayName}
            </Tooltip>
          ) : (
            <span class="tavernary-companion-project-card__title-text">{project.displayName}</span>
          )}
        </h3>
        {project.tavernKeeper ? (
          <TavernKeeperScanIndicator projectId={project.id} status={project.tavernKeeper} />
        ) : null}
      </div>
      {project.attributionLabel ? (
        <Tooltip
          id={`${project.id}-attribution`}
          label={project.tooltips.attribution ?? ""}
          className="tavernary-companion-project-card__attribution"
        >
          {project.attributionLabel}
        </Tooltip>
      ) : null}
      <p class="tavernary-companion-project-card__summary">{project.summary}</p>
      <div class="tavernary-companion-project-card__bottom">
        <div class="tavernary-companion-project-card__chips">
          {project.frontends.map((frontend, index) => (
            <Tooltip
              id={`${project.id}-frontend-${index}`}
              label={project.tooltips.frontends[index] ?? ""}
              className="tavernary-companion-chip tavernary-companion-chip--frontend"
            >
              {frontend}
            </Tooltip>
          ))}
          {project.tagChips.map((tag, index) => (
            <Tooltip
              id={`${project.id}-tag-${index}`}
              label={project.tooltips.tags[index] ?? ""}
              className={`tavernary-companion-chip tavernary-companion-chip--tag tag-${tag.facet}`}
            >
              {tag.label}
            </Tooltip>
          ))}
          {project.preset?.modelFamilies.map((family, index) => (
            <Tooltip
              id={`${project.id}-model-${index}`}
              label={project.tooltips.preset?.modelFamilies[index] ?? ""}
              className="tavernary-companion-chip"
            >
              {family}
            </Tooltip>
          ))}
          {project.preset?.completionFormats.map((format, index) => (
            <Tooltip
              id={`${project.id}-completion-${index}`}
              label={project.tooltips.preset?.completionFormats[index] ?? ""}
              className="tavernary-companion-chip"
            >
              {format}
            </Tooltip>
          ))}
        </div>
        {project.action.reason ? (
          <p class="tavernary-companion-project-card__reason">{project.action.reason}</p>
        ) : null}
        <div class="tavernary-companion-project-card__utility">
          <div class="tavernary-companion-project-card__meta">
            <Tooltip
              id={`${project.id}-license`}
              label={project.tooltips.license}
              className={`tavernary-companion-license license-${project.licenseStatus}`}
            >
              {project.licenseLabel}
            </Tooltip>
            {project.installed ? <span>Installed</span> : null}
          </div>
          <footer>
            {managedInSillyTavern ? (
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
