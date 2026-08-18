import type { ActiveOperation } from "../../lifecycle/operation-lock";
import type { LifecycleReceipt } from "../../lifecycle/operation-receipt";
import { OperationReceipt } from "./operation-receipt";

interface OperationTrayProps {
  active: ActiveOperation | null;
  receipt: LifecycleReceipt | null;
  error?: string | null;
  onDismissReceipt?(): void;
  onDismissError?(): void;
  onRetryError?(): void;
}

export function OperationTray({
  active,
  receipt,
  error,
  onDismissReceipt,
  onDismissError,
  onRetryError,
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
  if (receipt) {
    return (
      <aside class="tavernary-companion-operation-tray">
        <OperationReceipt receipt={receipt} onDismiss={onDismissReceipt} />
      </aside>
    );
  }
  return null;
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
