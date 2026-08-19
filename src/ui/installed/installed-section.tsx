import type {
  InstalledRowViewModel,
  InstalledSectionViewModel,
} from "../../catalog/installed-view-model";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import { ProjectLifecycleControl } from "../projects/project-lifecycle-control";

interface InstalledSectionProps {
  section: InstalledSectionViewModel;
  memberships?: ReadonlyMap<string, readonly string[]>;
  togglingInternalName?: string | null;
  onAction?(id: string, action: ProjectPrimaryAction, anchor: HTMLButtonElement): void;
  onManage?(): void;
  onToggleExtension?(projectId: string, internalName: string, enabled: boolean): void;
  lifecycleDisabled?: boolean;
}

export function InstalledSection({
  section,
  memberships = new Map(),
  togglingInternalName = null,
  onAction,
  onManage,
  onToggleExtension,
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
        <div class="tavernary-companion-installed-grid">
          {section.rows.map((row) => (
            <InstalledCard
              key={`${section.id}-${row.id}`}
              row={row}
              sectionId={section.id}
              kitTitles={memberships.get(row.id) ?? []}
              toggling={togglingInternalName === row.internalName}
              onAction={onAction}
              onManage={onManage}
              onToggleExtension={onToggleExtension}
              lifecycleDisabled={lifecycleDisabled}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InstalledCard({
  row,
  sectionId,
  kitTitles,
  toggling,
  onAction,
  onManage,
  onToggleExtension,
  lifecycleDisabled,
}: {
  row: InstalledRowViewModel;
  sectionId: InstalledSectionViewModel["id"];
  kitTitles: readonly string[];
  toggling: boolean;
  onAction?: (id: string, action: ProjectPrimaryAction, anchor: HTMLButtonElement) => void;
  onManage?: () => void;
  onToggleExtension?: (projectId: string, internalName: string, enabled: boolean) => void;
  lifecycleDisabled?: boolean;
}): preact.JSX.Element {
  const unknown = sectionId === "unknown" || row.action.kind === "manage-in-sillytavern";
  return (
    <article
      class={`tavernary-companion-installed-card${row.enabled !== null ? " is-installed" : " is-missing"}${row.enabled === false ? " is-disabled" : ""}`}
    >
      <header>
        <span>{sectionLabel(sectionId)}</span>
        {row.enabled !== null ? <strong>{row.enabled ? "Enabled" : "Disabled"}</strong> : null}
      </header>
      <h4>
        {row.canonicalUrl ? (
          <a href={row.canonicalUrl} target="_blank" rel="noopener noreferrer">
            {row.name}
          </a>
        ) : (
          row.name
        )}
      </h4>
      {kitTitles.length ? (
        <div class="tavernary-companion-installed-memberships">In {kitTitles.join(", ")}</div>
      ) : null}
      <footer>
        {row.toggleable && row.internalName && row.enabled !== null ? (
          <button
            type="button"
            role="switch"
            class="tavernary-companion-extension-toggle"
            aria-checked={row.enabled}
            aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.name}`}
            disabled={lifecycleDisabled || toggling}
            onClick={() => onToggleExtension?.(row.id, row.internalName!, !row.enabled)}
          >
            <span aria-hidden="true">
              <i />
            </span>
            <b>{toggling ? "Updating…" : row.enabled ? "Enabled" : "Disabled"}</b>
          </button>
        ) : null}
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
            onAction={(action, anchor) => onAction?.(row.id, action, anchor)}
          />
        )}
      </footer>
    </article>
  );
}

function sectionLabel(id: InstalledSectionViewModel["id"]): string {
  return {
    managed: "Companion managed",
    external: "Installed externally",
    unknown: "Uncataloged",
    attention: "Needs attention",
  }[id];
}

function emptyExplanation(id: InstalledSectionViewModel["id"]): string {
  return {
    managed: "No installed extensions are currently managed by Companion.",
    external: "No catalog extensions were found outside Companion management.",
    unknown: "Every discovered extension matched the current catalog.",
    attention: "No managed records need attention.",
  }[id];
}
