import type {
  InstalledRowViewModel,
  InstalledSectionViewModel,
} from "../../catalog/installed-view-model";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import type { ProjectUpdateState } from "../../updates/update-coordinator";
import { ProjectLifecycleControl } from "../projects/project-lifecycle-control";

interface InstalledSectionProps {
  section: InstalledSectionViewModel;
  memberships?: ReadonlyMap<string, readonly string[]>;
  togglingInternalName?: string | null;
  updateStates?: Readonly<Record<string, ProjectUpdateState>>;
  onAction?(id: string, action: ProjectPrimaryAction, anchor: HTMLButtonElement): void;
  onRetryUpdate?(id: string): void;
  onUpdate?(id: string, anchor: HTMLButtonElement): void;
  onManage?(): void;
  onToggleExtension?(projectId: string, internalName: string, enabled: boolean): void;
  lifecycleDisabled?: boolean;
  selectedProjectIds?: readonly string[];
  onToggleSelection?(projectId: string): void;
}

export function InstalledSection({
  section,
  memberships = new Map(),
  togglingInternalName = null,
  updateStates = {},
  onAction,
  onRetryUpdate,
  onUpdate,
  onManage,
  onToggleExtension,
  lifecycleDisabled,
  selectedProjectIds = [],
  onToggleSelection,
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
              updateState={updateStates[row.id]}
              onAction={onAction}
              onRetryUpdate={onRetryUpdate}
              onUpdate={onUpdate}
              onManage={onManage}
              onToggleExtension={onToggleExtension}
              lifecycleDisabled={lifecycleDisabled}
              selected={selectedProjectIds.includes(row.id)}
              onToggleSelection={onToggleSelection}
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
  updateState,
  onAction,
  onRetryUpdate,
  onUpdate,
  onManage,
  onToggleExtension,
  lifecycleDisabled,
  selected,
  onToggleSelection,
}: {
  row: InstalledRowViewModel;
  sectionId: InstalledSectionViewModel["id"];
  kitTitles: readonly string[];
  toggling: boolean;
  updateState?: ProjectUpdateState;
  onAction?: (id: string, action: ProjectPrimaryAction, anchor: HTMLButtonElement) => void;
  onRetryUpdate?: (id: string) => void;
  onUpdate?: (id: string, anchor: HTMLButtonElement) => void;
  onManage?: () => void;
  onToggleExtension?: (projectId: string, internalName: string, enabled: boolean) => void;
  lifecycleDisabled?: boolean;
  selected: boolean;
  onToggleSelection?: (projectId: string) => void;
}): preact.JSX.Element {
  const unknown =
    sectionId === "ambiguous" ||
    sectionId === "unknown" ||
    row.action.kind === "manage-in-sillytavern";
  return (
    <article
      class={`tavernary-companion-installed-card is-installed${row.enabled === false ? " is-disabled" : ""}${selected ? " is-selected" : ""}`}
      onClick={(event) => {
        if (!row.selectionEligible || isInteractiveTarget(event.target)) return;
        onToggleSelection?.(row.id);
      }}
    >
      {row.selectionEligible ? (
        <button
          type="button"
          class="tavernary-companion-installed-card__select"
          aria-pressed={selected}
          aria-label={`${selected ? "Deselect" : "Select"} ${row.name}`}
          onClick={() => onToggleSelection?.(row.id)}
        />
      ) : null}
      <header>
        <span>{sectionLabel(sectionId)}</span>
        {updateState && updateState.kind !== "idle" ? (
          <strong
            class={`tavernary-companion-installed-update-status is-${updateState.kind}`}
            role="status"
            title={updateState.kind === "attention" ? updateState.reason : undefined}
          >
            {updateStatusLabel(updateState)}
          </strong>
        ) : null}
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
        <div class="tavernary-companion-installed-memberships" title={kitTitles.join(", ")}>
          In {kitTitles.join(", ")}
        </div>
      ) : null}
      {updateState?.kind === "attention" || updateState?.kind === "error" ? (
        <p class="tavernary-companion-installed-attention-reason">{updateState.reason}</p>
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
        {updateState?.kind === "available" ? (
          <button
            type="button"
            class="tavernary-companion-installed-update-button"
            aria-label={`Update ${row.name}`}
            disabled={lifecycleDisabled}
            onClick={(event) => onUpdate?.(row.id, event.currentTarget)}
          >
            Update
          </button>
        ) : null}
        {updateState?.kind === "error" ? (
          <button
            type="button"
            aria-label={`Retry updates for ${row.name}`}
            disabled={lifecycleDisabled}
            onClick={() => onRetryUpdate?.(row.id)}
          >
            Retry
          </button>
        ) : null}
        {updateState?.kind === "attention" && !unknown ? (
          <button
            type="button"
            aria-label={`Manage ${row.name} in SillyTavern`}
            disabled={lifecycleDisabled}
            onClick={() => onManage?.()}
          >
            Manage in SillyTavern
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

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea"));
}

function updateStatusLabel(state: Exclude<ProjectUpdateState, { kind: "idle" }>): string {
  if (
    state.kind === "available" &&
    state.notice === "You already have the latest scanned version."
  ) {
    return "Latest scanned";
  }
  return {
    checking: "Checking…",
    current: "Latest",
    available: "Update available",
    attention: "Needs attention",
    error: "Could not check",
  }[state.kind];
}

function sectionLabel(id: InstalledSectionViewModel["id"]): string {
  return {
    managed: "Companion managed",
    external: "Installed externally",
    ambiguous: "Catalog match ambiguous",
    unknown: "Uncataloged",
  }[id];
}

function emptyExplanation(id: InstalledSectionViewModel["id"]): string {
  return {
    managed: "No installed extensions are currently managed by Companion.",
    external: "No catalog extensions were found outside Companion management.",
    ambiguous: "No installed extensions have multiple catalog matches.",
    unknown: "Every discovered extension matched the current catalog.",
  }[id];
}
