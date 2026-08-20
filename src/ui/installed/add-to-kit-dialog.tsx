import type { PersonalKitV1 } from "../../kits/kit-types";
import { DialogFrame } from "../lifecycle/dialog-frame";

export type AddToKitTarget = { kind: "new" } | { kind: "existing"; kitId: string };

interface AddToKitDialogProps {
  selectedCount: number;
  kits: readonly PersonalKitV1[];
  onChoose(target: AddToKitTarget): void;
  onCancel(): void;
}

export function AddToKitDialog({
  selectedCount,
  kits,
  onChoose,
  onCancel,
}: AddToKitDialogProps): preact.JSX.Element {
  const noun = selectedCount === 1 ? "extension" : "extensions";
  const personalKits = [...kits].sort((left, right) => left.title.localeCompare(right.title));
  return (
    <DialogFrame label={`Add ${selectedCount} ${noun} to a Kit`} onCancel={onCancel}>
      <h2>Add to Kit</h2>
      <p>
        Add {selectedCount} selected {noun} to a new or existing personal Kit.
      </p>
      <p class="tavernary-companion-dialog__note">
        Adding to a Kit does not change extension ownership.
      </p>
      <div class="tavernary-companion-add-to-kit-targets">
        <button type="button" onClick={() => onChoose({ kind: "new" })}>
          Create a new Kit
        </button>
        {personalKits.map((kit) => (
          <button
            key={kit.id}
            type="button"
            aria-label={`Add to ${kit.title}`}
            onClick={() => onChoose({ kind: "existing", kitId: kit.id })}
          >
            {kit.title}
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </DialogFrame>
  );
}
