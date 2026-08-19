import { useEffect, useState } from "preact/hooks";

import type { KitPlan } from "../../kits/kit-plan";
import type { KitApproval } from "../../kits/kit-receipt";
import {
  computeInstallTargetBinding,
  initialInstallTargetSelections,
  type KitInstallTargetSelection,
} from "../../kits/kit-install-targets";
import { DialogFrame } from "../lifecycle/dialog-frame";
import { KitImpactSummary } from "./kit-impact-summary";
import { KitWarningGroup } from "./kit-warning-group";
import { KitVersionChoices } from "./kit-version-choices";

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
  const [selectedInstallTargets, setSelectedInstallTargets] = useState<KitInstallTargetSelection[]>(
    () => initialInstallTargetSelections(plan),
  );
  useEffect(() => {
    setSelectedInstallTargets(initialInstallTargetSelections(plan));
  }, [plan]);
  const everyVersionChosen =
    plan.installTargetsPrepared && selectedInstallTargets.length === plan.install.length;
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
      <KitVersionChoices
        steps={plan.install}
        selections={selectedInstallTargets}
        onChange={(projectId, target) =>
          setSelectedInstallTargets((current) => [
            ...current.filter((selection) => selection.projectId !== projectId),
            { projectId, target },
          ])
        }
      />
      <KitWarningGroup
        warnings={plan.warnings}
        selectedInstallTargets={selectedInstallTargets}
        onReview={onReview}
      />
      <footer>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          disabled={plan.blockingIssues.length > 0 || !everyVersionChosen}
          onClick={() =>
            onConfirm({
              planId: plan.id,
              inventoryFingerprint: plan.inventoryFingerprint,
              catalogGeneratedAt: plan.catalogGeneratedAt,
              catalogBinding: plan.catalogBinding,
              acceptedWarningProjectIds: plan.warnings.map(({ projectId }) => projectId),
              selectedInstallTargets,
              installTargetBinding: computeInstallTargetBinding(selectedInstallTargets),
            })
          }
        >
          {confirm}
        </button>
      </footer>
    </DialogFrame>
  );
}
