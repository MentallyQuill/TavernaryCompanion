import type { RemovalImpact } from "../../lifecycle/removal-impact";
import { DialogFrame } from "./dialog-frame";

interface RemovalDialogProps {
  impact: RemovalImpact;
  onCancel(): void;
  onConfirm(): void;
}

export function RemovalDialog({
  impact,
  onCancel,
  onConfirm,
}: RemovalDialogProps): preact.JSX.Element {
  return (
    <DialogFrame label={`Uninstall ${impact.projectName}`} onCancel={onCancel}>
      <h2>Uninstall {impact.projectName}?</h2>
      <p>{impact.ownershipLabel}</p>
      <p>{impact.confirmation}</p>
      <div class="tavernary-companion-dialog__actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" class="is-danger" onClick={onConfirm} disabled={!impact.removable}>
          Uninstall
        </button>
      </div>
    </DialogFrame>
  );
}
