import type { ActiveOperation } from "../../lifecycle/operation-lock";
import type { LifecycleReceipt } from "../../lifecycle/operation-receipt";
import { OperationReceipt } from "./operation-receipt";
import { OperationSuccessNotification } from "./operation-success-notification";
import type { BulkRemovalReceipt } from "../../lifecycle/bulk-removal";
import { BulkRemovalReceiptView } from "./bulk-removal-receipt";

interface OperationTrayProps {
  active: ActiveOperation | null;
  receipt: LifecycleReceipt | null;
  bulkRemovalReceipt?: BulkRemovalReceipt | null;
  error?: string | null;
  onDismissReceipt?(): void;
  onDismissError?(): void;
  onRetryError?(): void;
  onReload?(): void;
  onRetryBulkRemoval?(projectIds: string[]): void;
  onDismissBulkRemoval?(): void;
}

export function OperationTray({
  active,
  receipt,
  bulkRemovalReceipt,
  error,
  onDismissReceipt,
  onDismissError,
  onRetryError,
  onReload,
  onRetryBulkRemoval,
  onDismissBulkRemoval,
}: OperationTrayProps): preact.JSX.Element | null {
  if (error) {
    return (
      <aside
        class="tavernary-companion-operation-tray tavernary-companion-operation-tray--error"
        role="alert"
      >
        <p>{error}</p>
        {onRetryError ? (
          <button type="button" onClick={onRetryError}>
            Retry
          </button>
        ) : null}
        <button type="button" onClick={onDismissError}>
          Dismiss
        </button>
      </aside>
    );
  }
  if (active) {
    return (
      <aside class="tavernary-companion-operation-tray" role="status" aria-live="polite">
        <span class="tavernary-companion-operation-tray__indicator" aria-hidden="true" />
        <p>{phaseLabel(active.phase)}</p>
      </aside>
    );
  }
  if (bulkRemovalReceipt) {
    return (
      <BulkRemovalReceiptView
        receipt={bulkRemovalReceipt}
        onRetryFailed={(projectIds) => onRetryBulkRemoval?.(projectIds)}
        onDismiss={() => onDismissBulkRemoval?.()}
        onReload={() => onReload?.()}
      />
    );
  }
  if (receipt) {
    if (
      receipt.kind === "update" &&
      (receipt.status === "succeeded" || receipt.status === "updated-unrecorded")
    ) {
      return (
        <aside
          class="tavernary-companion-operation-tray tavernary-companion-update-reload"
          role="status"
          aria-label="Update complete"
          aria-live="polite"
        >
          <p>
            <strong>{updateSuccessLabel(receipt)}</strong> Reload to apply updates.
          </p>
          {receipt.safeError ? <p>{receipt.safeError}</p> : null}
          <button type="button" onClick={onReload}>
            Reload now
          </button>
        </aside>
      );
    }
    if (receipt.status === "succeeded") {
      return <OperationSuccessNotification receipt={receipt} onDismiss={onDismissReceipt} />;
    }
    return (
      <aside class="tavernary-companion-operation-tray">
        <OperationReceipt receipt={receipt} onDismiss={onDismissReceipt} />
      </aside>
    );
  }
  return null;
}

function updateSuccessLabel(receipt: LifecycleReceipt): string {
  if (receipt.installProvenance?.targetKind === "checked") {
    return "Updated to the latest scanned version.";
  }
  if (receipt.installProvenance?.targetKind === "newest") {
    return "Updated to the latest version from the creator.";
  }
  return `${receipt.projectName} updated.`;
}

function phaseLabel(phase: string): string {
  return (
    {
      preflight: "Checking project eligibility…",
      discovering: "Reading installed extensions…",
      "awaiting-confirmation": "Waiting for confirmation…",
      "host-request": "SillyTavern is applying the change…",
      verifying: "Verifying installed state…",
      recording: "Recording verified state…",
    }[phase] ?? "Working…"
  );
}
