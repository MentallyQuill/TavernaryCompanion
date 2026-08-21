import type { KitInspectorViewModel, KitPrimaryAction } from "../../kits/kit-view-model";
import { useRef, useState } from "preact/hooks";
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
  const [additionalActionsOpen, setAdditionalActionsOpen] = useState(false);
  const additionalActionsTriggerRef = useRef<HTMLButtonElement>(null);
  const additionalActionsId = `kit-actions-${kit.id}`;
  const headingId = `kit-heading-${kit.id}`;
  const availableCount = kit.components.filter(({ available }) => available).length;
  const attentionCount = Math.max(
    kit.flaggedCount,
    kit.components.filter(
      ({ available, assessment }) => !available || Boolean(assessment && assessment !== "low"),
    ).length,
  );

  const runAdditionalAction = (action: (() => void) | undefined): void => {
    setAdditionalActionsOpen(false);
    additionalActionsTriggerRef.current?.focus();
    action?.();
  };

  return (
    <article class="tavernary-companion-kit-inspector" aria-labelledby={headingId}>
      <header class="tavernary-companion-kit-inspector__header">
        <p class="tavernary-companion-kit-inspector__eyebrow">
          <span>{kit.originLabel}</span>
          <span>{kit.operationalStatus}</span>
        </p>
        <h2 id={headingId}>{kit.title}</h2>
        <p class="tavernary-companion-kit-inspector__description">{kit.description}</p>
      </header>
      <section class="tavernary-companion-kit-inspector__overview" aria-label="Kit overview">
        <dl>
          <div>
            <dt>Components</dt>
            <dd>{kit.componentCount}</dd>
          </div>
          <div>
            <dt>Available</dt>
            <dd>{availableCount}</dd>
          </div>
          <div>
            <dt>Needs attention</dt>
            <dd>{attentionCount}</dd>
          </div>
        </dl>
      </section>
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
          <button
            type="button"
            class="tavernary-companion-button tavernary-companion-button--primary"
            disabled={disabled}
            onClick={() => onAction(kit.primaryAction)}
          >
            {kit.primaryAction.label}
          </button>
        ) : null}
        {kit.editable ? (
          <button
            type="button"
            class="tavernary-companion-button tavernary-companion-button--secondary"
            onClick={onEdit}
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            class="tavernary-companion-button tavernary-companion-button--secondary"
            onClick={onCopy}
          >
            Copy to Personal Kits
          </button>
        )}
        {kit.editable ? (
          <div class="tavernary-companion-kit-inspector__more">
            <button
              type="button"
              ref={additionalActionsTriggerRef}
              class="tavernary-companion-button tavernary-companion-button--secondary"
              aria-expanded={additionalActionsOpen}
              aria-controls={additionalActionsId}
              onClick={() => setAdditionalActionsOpen((open) => !open)}
            >
              More Kit actions
            </button>
            {additionalActionsOpen ? (
              <div
                id={additionalActionsId}
                class="tavernary-companion-kit-inspector__more-panel"
                role="group"
                aria-label="Additional Kit actions"
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  setAdditionalActionsOpen(false);
                  additionalActionsTriggerRef.current?.focus();
                }}
              >
                <button type="button" onClick={() => runAdditionalAction(onExport)}>
                  Export
                </button>
                <button type="button" onClick={() => runAdditionalAction(onDuplicate)}>
                  Duplicate
                </button>
                <button
                  type="button"
                  class="is-danger"
                  disabled={disabled}
                  title={
                    kit.operationalStatus === "Saved"
                      ? undefined
                      : "Remove this Kit while keeping its extensions installed."
                  }
                  onClick={() => runAdditionalAction(onRemove)}
                >
                  {kit.operationalStatus === "Saved"
                    ? "Remove saved Kit"
                    : "Remove Kit, keep extensions"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {kit.operationalStatus !== "Saved" ? (
          <button
            type="button"
            class="tavernary-companion-button tavernary-companion-button--danger"
            disabled={disabled}
            onClick={onUninstall}
          >
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
