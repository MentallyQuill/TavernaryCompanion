import type { TrustPrompt } from "../../trust/trust-types";
import { DialogFrame } from "./dialog-frame";

interface AssessmentWarningDialogProps {
  projectName: string;
  prompt: Extract<TrustPrompt, { kind: "assessment-warning" }>;
  onReview(url: string): void;
  onCancel(): void;
  onConfirm(): void;
}

export function AssessmentWarningDialog({
  projectName,
  prompt,
  onReview,
  onCancel,
  onConfirm,
}: AssessmentWarningDialogProps): preact.JSX.Element {
  const high = prompt.severity === "high";
  return (
    <DialogFrame
      label={`Security warning for ${projectName}`}
      className={high ? "is-high" : "is-material"}
      onCancel={onCancel}
    >
      <p class="tavernary-companion-dialog__severity">
        {high ? "Immediate danger" : "Material concern"}
      </p>
      <h2>Review before installing {projectName}</h2>
      <p>{prompt.copy}</p>
      {prompt.reviewDisabledReason ? <p>{prompt.reviewDisabledReason}</p> : null}
      <div class="tavernary-companion-dialog__actions">
        <button
          type="button"
          onClick={() => prompt.reportUrl && onReview(prompt.reportUrl)}
          disabled={!prompt.reportUrl}
        >
          Scan Review
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" class="is-danger" onClick={onConfirm}>
          Install anyway
        </button>
      </div>
    </DialogFrame>
  );
}
