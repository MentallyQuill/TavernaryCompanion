import type { LifecycleReceipt } from "../../lifecycle/operation-receipt";

interface OperationReceiptProps {
  receipt: LifecycleReceipt;
  onDismiss?(): void;
}

export function OperationReceipt({
  receipt,
  onDismiss,
}: OperationReceiptProps): preact.JSX.Element {
  const succeeded = receipt.status === "succeeded";
  return (
    <section class="tavernary-companion-operation-receipt" aria-label="Operation receipt">
      <h3>{receiptHeading(receipt)}</h3>
      {receipt.safeError ? <p>{receipt.safeError}</p> : null}
      {receipt.reloadRequired ? <p>Reload required</p> : null}
      <ol>
        {receipt.steps.map((step) => (
          <li data-status={step.status}>
            {stepLabel(step.id)}: {step.status}
          </li>
        ))}
      </ol>
      <p>{succeeded ? "Verified against SillyTavern." : "No unverified success was recorded."}</p>
      {onDismiss ? (
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </section>
  );
}

function receiptHeading(receipt: LifecycleReceipt): string {
  if (receipt.status === "succeeded") {
    return `${receipt.projectName} ${receipt.kind === "install" ? "installed" : "removed"} and verified`;
  }
  if (receipt.status === "cancelled") return `${receipt.projectName} operation cancelled`;
  return `${receipt.projectName} ${receipt.kind} did not complete`;
}

function stepLabel(id: LifecycleReceipt["steps"][number]["id"]): string {
  return {
    requested: "Requested",
    "host-accepted": "Host accepted",
    verified: "Verified",
    recorded: "Recorded",
  }[id];
}
