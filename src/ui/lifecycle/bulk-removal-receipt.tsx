import type { BulkRemovalReceipt } from "../../lifecycle/bulk-removal";

interface BulkRemovalReceiptViewProps {
  receipt: BulkRemovalReceipt;
  onRetryFailed(projectIds: string[]): void;
  onDismiss(): void;
  onReload(): void;
}

export function BulkRemovalReceiptView({
  receipt,
  onRetryFailed,
  onDismiss,
  onReload,
}: BulkRemovalReceiptViewProps): preact.JSX.Element {
  const removed = receipt.results.length - receipt.retryableProjectIds.length;
  return (
    <aside
      class="tavernary-companion-operation-tray tavernary-companion-bulk-removal-receipt"
      role="status"
      aria-label="Bulk uninstall result"
    >
      <h2>{receipt.status === "succeeded" ? "Uninstall complete" : "Uninstall finished"}</h2>
      <p>
        {removed} removed · {receipt.retryableProjectIds.length} failed
      </p>
      <ul>
        {receipt.results.map((result) => {
          const succeeded = result.status === "succeeded" || result.status === "removed-unrecorded";
          return (
            <li key={result.id}>
              {result.projectName} — {succeeded ? "Removed" : "Failed"}
              {result.safeError ? <small>{result.safeError}</small> : null}
            </li>
          );
        })}
      </ul>
      {receipt.reloadRequired ? <p>Reload is required to finish applying changes.</p> : null}
      <div>
        {receipt.retryableProjectIds.length ? (
          <button type="button" onClick={() => onRetryFailed([...receipt.retryableProjectIds])}>
            Retry failed
          </button>
        ) : null}
        {receipt.reloadRequired ? (
          <button type="button" onClick={onReload}>
            Reload now
          </button>
        ) : null}
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}
