import type {
  ProjectDetailViewModel,
  ProjectPrimaryAction,
} from "../../catalog/project-view-model";
import { COMPANION_PROJECT_ID } from "../../lifecycle/self-protection";
import { ProjectEvidence } from "./project-evidence";

interface ProjectDetailProps {
  project: ProjectDetailViewModel;
  onAction(action: ProjectPrimaryAction): void;
  onManageInSillyTavern?(): void;
  lifecycleDisabled?: boolean;
}

export function ProjectDetail({
  project,
  onAction,
  onManageInSillyTavern,
  lifecycleDisabled = false,
}: ProjectDetailProps): preact.JSX.Element {
  const selfProtected =
    project.id === COMPANION_PROJECT_ID || project.action.kind === "current-extension";
  return (
    <article class="tavernary-companion-project-detail">
      <header>
        <p>{project.kind}</p>
        <h2>{project.name}</h2>
        <p>{project.summary}</p>
        {selfProtected ? (
          <button type="button" onClick={onManageInSillyTavern}>
            Manage in SillyTavern
          </button>
        ) : (
          <button
            type="button"
            aria-label={`${project.action.label} ${project.name}`}
            onClick={() => onAction(project.action)}
            disabled={lifecycleDisabled}
          >
            {project.action.label}
          </button>
        )}
        {project.action.reason ? <p>{project.action.reason}</p> : null}
      </header>
      <section aria-labelledby="project-details-heading">
        <h3 id="project-details-heading">Project details</h3>
        <dl>
          <div>
            <dt>Frontends</dt>
            <dd>{project.frontends.join(", ") || "Not specified"}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{project.primaryFunction}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd title={project.license.tooltip}>{project.license.label}</dd>
          </div>
          <div>
            <dt>Catalog metadata</dt>
            <dd>{project.metadataStatus}</dd>
          </div>
          <div>
            <dt>Source status</dt>
            <dd>{project.sourceStatus}</dd>
          </div>
          <div>
            <dt>Installed ownership</dt>
            <dd>{project.ownership}</dd>
          </div>
        </dl>
        {project.tags.length > 0 ? (
          <ul aria-label="Project tags">
            {project.tags.map((tag) => (
              <li>{tag}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <ProjectEvidence project={project} />
      {project.attribution ? (
        <p>Catalog attribution: {project.attribution.owner.login}</p>
      ) : (
        <p>Catalog attribution is pending.</p>
      )}
      {project.fork ? (
        <p>
          Fork of{" "}
          {project.fork.parentUrl ? (
            <a href={project.fork.parentUrl} target="_blank" rel="noreferrer noopener">
              {project.fork.parentName} (new tab)
            </a>
          ) : (
            project.fork.parentName
          )}
        </p>
      ) : null}
      {project.kitReferences.length > 0 ? (
        <section aria-labelledby="project-kits-heading">
          <h3 id="project-kits-heading">Included in Kits</h3>
          <ul>
            {project.kitReferences.map((kit) => (
              <li>{kit.title}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <a href={project.canonicalUrl} target="_blank" rel="noreferrer noopener">
        Open project source (new tab)
      </a>
    </article>
  );
}
