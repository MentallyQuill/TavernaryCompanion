import type { BulkRemovalPlan } from "../../lifecycle/bulk-removal";
import { DialogFrame } from "./dialog-frame";

interface BulkRemovalDialogProps {
  plan: BulkRemovalPlan;
  onCancel(): void;
  onConfirm(): void;
}

export function BulkRemovalDialog({
  plan,
  onCancel,
  onConfirm,
}: BulkRemovalDialogProps): preact.JSX.Element {
  const count = plan.projectIds.length;
  const noun = count === 1 ? "extension" : "extensions";
  return (
    <DialogFrame label={`Uninstall ${count} ${noun}`} onCancel={onCancel}>
      <h2>
        Uninstall {count} {noun}?
      </h2>
      <p>Companion will uninstall each extension in order and verify it before continuing.</p>
      <ul class="tavernary-companion-bulk-removal-projects">
        {plan.impacts.map((impact) => (
          <li key={impact.projectId}>
            <strong>{impact.projectName}</strong>
            <span>{impact.ownershipLabel}</span>
            {!impact.removable ? <span>Cannot be uninstalled from Companion.</span> : null}
          </li>
        ))}
      </ul>
      {plan.affectedKits.length ? (
        <section aria-label="Affected Kits">
          <h3>Affected Kits</h3>
          {plan.affectedKits.map((kit) => (
            <p key={kit.id}>{kit.title} will become Partial.</p>
          ))}
          {plan.activeKitAffected ? <p>The active Kit will show drift.</p> : null}
        </section>
      ) : null}
      <div class="tavernary-companion-dialog__actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" class="is-danger" onClick={onConfirm} disabled={!plan.confirmable}>
          Uninstall {count}
        </button>
      </div>
    </DialogFrame>
  );
}
