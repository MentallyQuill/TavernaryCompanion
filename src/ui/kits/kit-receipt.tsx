import type { KitReceipt as KitReceiptModel } from "../../kits/kit-receipt";

export function KitReceipt({
  receipt,
  onDismiss,
  onRetry,
}: {
  receipt: KitReceiptModel;
  onDismiss(): void;
  onRetry?(): void;
}): preact.JSX.Element {
  return (
    <article class="tavernary-companion-kit-receipt">
      <header>
        <div>
          <h3>
            {receipt.operation === "activate" && receipt.outcome === "completed"
              ? "Managed Kit activated"
              : receiptHeading(receipt.outcome)}
          </h3>
          {receipt.previousActiveKitId &&
          receipt.activeKitId === receipt.previousActiveKitId &&
          receipt.outcome !== "completed" ? (
            <p>{receipt.previousActiveKitId} remains active.</p>
          ) : null}
        </div>
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </header>
      <ul>
        {receipt.projects.map((project, index) => (
          <li key={`${project.projectId}-${project.action}-${index}`}>
            <strong>{project.projectId}</strong>
            <span>
              {actionLabel(project.action)} · {statusLabel(project.status)}
            </span>
            <span>{project.message}</span>
          </li>
        ))}
      </ul>
      {receipt.projects.some(({ retryable }) => retryable) ? (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </article>
  );
}

function receiptHeading(outcome: KitReceiptModel["outcome"]): string {
  return {
    completed: "Kit finished",
    partial: "Kit partly finished",
    failed: "Kit didn't finish",
    interrupted: "Kit was interrupted",
  }[outcome];
}

function actionLabel(action: KitReceiptModel["projects"][number]["action"]): string {
  return {
    install: "Install",
    enable: "Enable",
    disable: "Disable",
    remove: "Remove",
    keep: "Keep",
    context: "Check",
  }[action];
}

function statusLabel(status: KitReceiptModel["projects"][number]["status"]): string {
  return {
    verified: "Finished",
    failed: "Needs attention",
    untouched: "Not started",
    kept: "Kept",
    external: "Left as is",
    context: "No change needed",
  }[status];
}
