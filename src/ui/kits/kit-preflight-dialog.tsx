import type { KitPlan } from "../../kits/kit-plan";
import type { KitApproval } from "../../kits/kit-receipt";
import { DialogFrame } from "../lifecycle/dialog-frame";
import { KitImpactSummary } from "./kit-impact-summary";
import { KitWarningGroup } from "./kit-warning-group";

export function KitPreflightDialog({
  plan,
  onCancel,
  onReview,
  onConfirm,
}: {
  plan: Readonly<KitPlan>;
  onCancel(): void;
  onReview(url: string): void;
  onConfirm(approval: KitApproval): void;
}): preact.JSX.Element {
  const confirm = plan.warnings.length
    ? "Install anyway"
    : {
        install: "Install Kit",
        activate: "Activate Kit",
        deactivate: "Deactivate Kit",
        uninstall: "Uninstall Kit",
      }[plan.operation];
  return (
    <DialogFrame label={`${confirm} review`} onCancel={onCancel}>
      <header>
        <h2>Review {plan.operation} changes</h2>
        <p>Companion changes only extensions it manages. External extensions remain untouched.</p>
      </header>
      <KitImpactSummary plan={plan} />
      <KitWarningGroup warnings={plan.warnings} onReview={onReview} />
      <footer>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          disabled={plan.blockingIssues.length > 0}
          onClick={() =>
            onConfirm({
              planId: plan.id,
              inventoryFingerprint: plan.inventoryFingerprint,
              catalogGeneratedAt: plan.catalogGeneratedAt,
              acceptedWarningProjectIds: plan.warnings.map(({ projectId }) => projectId),
            })
          }
        >
          {confirm}
        </button>
      </footer>
    </DialogFrame>
  );
}
