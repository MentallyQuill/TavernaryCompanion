import type { ActiveOperation } from "../../lifecycle/operation-lock";
import type { KitReceipt as KitReceiptModel } from "../../kits/kit-receipt";
import { KitReceipt } from "./kit-receipt";

export function KitOperationTray({
  active,
  receipt,
  onDismiss,
  onReload,
  onRetry,
}: {
  active: ActiveOperation | null;
  receipt: KitReceiptModel | null;
  onDismiss(): void;
  onReload(): void;
  onRetry?(): void;
}): preact.JSX.Element | null {
  if (active?.operationId.startsWith("kit:"))
    return (
      <aside class="tavernary-companion-kit-operation-tray" role="status" aria-live="polite">
        <span aria-hidden="true" /> <p>{phase(active.phase)}</p>
      </aside>
    );
  if (receipt)
    return (
      <aside class="tavernary-companion-kit-operation-tray">
        <KitReceipt receipt={receipt} onDismiss={onDismiss} onReload={onReload} onRetry={onRetry} />
      </aside>
    );
  return null;
}
function phase(value: string): string {
  if (value.startsWith("installing:")) return `Installing ${value.slice(11)}…`;
  if (value.startsWith("removing:")) return `Removing ${value.slice(9)}…`;
  return (
    {
      activating: "Activating managed extensions…",
      deactivating: "Deactivating managed extensions…",
      preflight: "Checking Kit plan…",
    }[value] ?? "Applying Kit changes…"
  );
}
