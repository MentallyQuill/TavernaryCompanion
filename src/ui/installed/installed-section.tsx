import type {
  InstalledRowViewModel,
  InstalledSectionViewModel,
} from "../../catalog/installed-view-model";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";

interface InstalledSectionProps {
  section: InstalledSectionViewModel;
  onOpenProject?(id: string): void;
  onAction?(id: string, action: ProjectPrimaryAction): void;
  onManage?(): void;
}

export function InstalledSection({
  section,
  onOpenProject,
  onAction,
  onManage,
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
              onOpenProject={onOpenProject}
              onAction={onAction}
              onManage={onManage}
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
  onOpenProject,
  onAction,
  onManage,
}: {
  row: InstalledRowViewModel;
  sectionId: InstalledSectionViewModel["id"];
  onOpenProject?: (id: string) => void;
  onAction?: (id: string, action: ProjectPrimaryAction) => void;
  onManage?: () => void;
}): preact.JSX.Element {
  const unknown = sectionId === "unknown" || row.action.kind === "manage-in-sillytavern";
  return (
    <li>
      <div>
        <strong>{row.name}</strong>
        <span>{row.detail}</span>
        {row.enabled !== null ? <span>{row.enabled ? "Enabled" : "Disabled"}</span> : null}
      </div>
      {!unknown ? (
        <button
          type="button"
          data-focus-key={`installed-${row.id}`}
          onClick={() => onOpenProject?.(row.id)}
          aria-label={`View ${row.name}`}
        >
          Details
        </button>
      ) : null}
      <button
        type="button"
        aria-label={
          unknown ? `Manage ${row.name} in SillyTavern` : `${row.action.label} ${row.name}`
        }
        onClick={() => (unknown ? onManage?.() : onAction?.(row.id, row.action))}
      >
        {row.action.label}
      </button>
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
