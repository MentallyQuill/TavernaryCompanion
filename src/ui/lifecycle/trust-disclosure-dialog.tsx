import type { TrustPrompt } from "../../trust/trust-types";
import { DialogFrame } from "./dialog-frame";

interface TrustDisclosureDialogProps {
  prompt: Extract<TrustPrompt, { kind: "unsandboxed-disclosure" }>;
  onCancel(): void;
  onConfirm(): void;
}

export function TrustDisclosureDialog({
  prompt,
  onCancel,
  onConfirm,
}: TrustDisclosureDialogProps): preact.JSX.Element {
  return (
    <DialogFrame label="Third-party extension disclosure" onCancel={onCancel}>
      <h2>Before installing extensions</h2>
      <p>{prompt.copy}</p>
      <div class="tavernary-companion-dialog__actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm}>
          I understand
        </button>
      </div>
    </DialogFrame>
  );
}
