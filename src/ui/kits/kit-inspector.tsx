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
}: {
  kit: KitInspectorViewModel;
  disabled?: boolean;
  onAction(action: KitPrimaryAction): void;
  onEdit?(): void;
  onCopy?(): void;
  onExport?(): void;
  onUninstall?(): void;
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
      <div class="tavernary-companion-kit-inspector__actions">
        <button type="button" disabled={disabled} onClick={() => onAction(kit.primaryAction)}>
          {kit.primaryAction.label}
        </button>
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
