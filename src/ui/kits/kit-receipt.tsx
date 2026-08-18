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
              : `Kit ${receipt.outcome}`}
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
              {project.action} · {project.status}
            </span>
            <span>{project.message}</span>
          </li>
        ))}
      </ul>
      {receipt.projects.some(({ retryable }) => retryable) ? (
        <button type="button" onClick={onRetry}>
          Review retry
        </button>
      ) : null}
    </article>
  );
}
