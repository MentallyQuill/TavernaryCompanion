import type { KitInspectorViewModel, KitPrimaryAction } from "../../kits/kit-view-model";
import { KitComponentGroup } from "./kit-component-group";

const groups = [
  { id: "managed", title: "Managed/actionable extensions" },
  { id: "external", title: "External extensions" },
  { id: "context", title: "Context-only projects" },
  { id: "unavailable", title: "Unavailable or changed" },
] as const;

export function KitInspector({
  kit,
  disabled,
  onAction,
  onEdit,
  onCopy,
  onExport,
  onUninstall,
  onDuplicate,
  onRemove,
}: {
  kit: KitInspectorViewModel;
  disabled?: boolean;
  onAction(action: KitPrimaryAction): void;
  onEdit?(): void;
  onCopy?(): void;
  onExport?(): void;
  onUninstall?(): void;
  onDuplicate?(): void;
  onRemove?(): void;
}): preact.JSX.Element {
  return (
    <article class="tavernary-companion-kit-inspector">
      <header>
        <p>
          {kit.originLabel} · {kit.operationalStatus}
        </p>
        <h2>{kit.title}</h2>
        <p>{kit.description}</p>
      </header>
      {kit.topologyChange ? (
        <section class="tavernary-companion-kit-inspector__topology">
          <h3>Membership changes</h3>
          {kit.topologyChange.kind === "exact" ? (
            <>
              <p>Previously installed: {list(kit.topologyChange.previousProjectIds)}</p>
              <p>Added: {list(kit.topologyChange.addedProjectIds)}</p>
              <p>Removed: {list(kit.topologyChange.removedProjectIds)}</p>
            </>
          ) : (
            <p>Previous membership is unavailable for this legacy install.</p>
          )}
          <p>Current Tavernary Kit: {list(kit.topologyChange.currentProjectIds)}</p>
        </section>
      ) : null}
      <div class="tavernary-companion-kit-inspector__actions">
        {kit.primaryAction.kind !== "review" && kit.primaryAction.kind !== "view" ? (
          <button type="button" disabled={disabled} onClick={() => onAction(kit.primaryAction)}>
            {kit.primaryAction.label}
          </button>
        ) : null}
        {kit.editable ? (
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        ) : (
          <button type="button" onClick={onCopy}>
            Copy to Personal Kits
          </button>
        )}
        {kit.editable ? (
          <button type="button" onClick={onExport}>
            Export
          </button>
        ) : null}
        {kit.editable ? (
          <button type="button" onClick={onDuplicate}>
            Duplicate
          </button>
        ) : null}
        {kit.editable ? (
          <button
            type="button"
            disabled={disabled}
            title={
              kit.operationalStatus === "Saved"
                ? undefined
                : "Remove this Kit while keeping its extensions installed."
            }
            onClick={onRemove}
          >
            {kit.operationalStatus === "Saved" ? "Remove saved Kit" : "Remove Kit, keep extensions"}
          </button>
        ) : null}
        {kit.operationalStatus !== "Saved" ? (
          <button type="button" disabled={disabled} onClick={onUninstall}>
            Uninstall Kit
          </button>
        ) : null}
      </div>
      {groups.map(({ id, title }) => (
        <KitComponentGroup
          key={id}
          title={title}
          components={kit.components.filter(({ group }) => group === id)}
        />
      ))}
    </article>
  );
}

function list(projectIds: readonly string[]): string {
  return projectIds.length ? projectIds.join(", ") : "None";
}
