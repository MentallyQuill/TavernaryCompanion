import type {
  InstalledRowViewModel,
  InstalledSectionViewModel,
} from "../../catalog/installed-view-model";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import { ProjectLifecycleControl } from "../projects/project-lifecycle-control";

interface InstalledSectionProps {
  section: InstalledSectionViewModel;
  onAction?(id: string, action: ProjectPrimaryAction): void;
  onManage?(): void;
  lifecycleDisabled?: boolean;
}

export function InstalledSection({
  section,
  onAction,
  onManage,
  lifecycleDisabled,
}: InstalledSectionProps): preact.JSX.Element {
  return (
    <section class="tavernary-companion-installed-section">
      <header>
        <h3>{section.title}</h3>
        <span>{section.rows.length}</span>
      </header>
      {section.rows.length === 0 ? (
        <p>{emptyExplanation(section.id)}</p>
      ) : (
        <ul>
          {section.rows.map((row) => (
            <InstalledRow
              row={row}
              sectionId={section.id}
              onAction={onAction}
              onManage={onManage}
              lifecycleDisabled={lifecycleDisabled}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function InstalledRow({
  row,
  sectionId,
  onAction,
  onManage,
  lifecycleDisabled,
}: {
  row: InstalledRowViewModel;
  sectionId: InstalledSectionViewModel["id"];
  onAction?: (id: string, action: ProjectPrimaryAction) => void;
  onManage?: () => void;
  lifecycleDisabled?: boolean;
}): preact.JSX.Element {
  const unknown = sectionId === "unknown" || row.action.kind === "manage-in-sillytavern";
  return (
    <li>
      <div>
        <strong>
          {row.canonicalUrl ? (
            <a href={row.canonicalUrl} target="_blank" rel="noopener noreferrer">
              {row.name}
            </a>
          ) : (
            row.name
          )}
        </strong>
        <span>{row.detail}</span>
        {row.enabled !== null ? <span>{row.enabled ? "Enabled" : "Disabled"}</span> : null}
      </div>
      {unknown ? (
        <button
          type="button"
          aria-label={`Manage ${row.name} in SillyTavern`}
          onClick={() => onManage?.()}
        >
          {row.action.label}
        </button>
      ) : (
        <ProjectLifecycleControl
          projectName={row.name}
          action={row.action}
          disabled={lifecycleDisabled}
          onAction={(action) => onAction?.(row.id, action)}
        />
      )}
    </li>
  );
}

function emptyExplanation(id: InstalledSectionViewModel["id"]): string {
  return {
    managed: "No installed extensions are currently managed by Companion.",
    external: "No catalog extensions were found outside Companion management.",
    unknown: "Every discovered extension matched the current catalog.",
    attention: "No managed records need attention.",
  }[id];
}
