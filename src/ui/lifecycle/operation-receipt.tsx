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
      {receipt.installProvenance?.targetKind === "checked" ||
      receipt.installProvenance?.targetKind === "newest" ? (
        <InstallDetails receipt={receipt} />
      ) : null}
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
    if (receipt.kind === "install" && receipt.installProvenance?.targetKind === "checked") {
      return "Installed the checked version.";
    }
    if (receipt.kind === "install" && receipt.installProvenance?.targetKind === "newest") {
      return "Installed the newest version.";
    }
    return `${receipt.projectName} ${receipt.kind === "install" ? "installed" : "removed"} and verified`;
  }
  if (receipt.status === "cancelled") return `${receipt.projectName} operation cancelled`;
  return `${receipt.projectName} ${receipt.kind} did not complete`;
}

function InstallDetails({ receipt }: { receipt: LifecycleReceipt }): preact.JSX.Element {
  const provenance = receipt.installProvenance!;
  return (
    <details class="tavernary-companion-operation-receipt__details">
      <summary>Details</summary>
      <dl>
        <dt>Requested SHA</dt>
        <dd>
          {provenance.requestedSha ? <code>{provenance.requestedSha}</code> : "Not available"}
        </dd>
        <dt>Installed SHA</dt>
        <dd>
          {provenance.installedSha ? <code>{provenance.installedSha}</code> : "Not available"}
        </dd>
        <dt>Catalog time</dt>
        <dd>
          {provenance.catalogGeneratedAt ? (
            <time dateTime={provenance.catalogGeneratedAt}>
              {formatTechnicalDate(provenance.catalogGeneratedAt)}
            </time>
          ) : (
            "Not available"
          )}
        </dd>
        {receipt.tavernKeeperReportUrl ? (
          <>
            <dt>TavernKeeper</dt>
            <dd>
              <a href={receipt.tavernKeeperReportUrl} target="_blank" rel="noopener noreferrer">
                TavernKeeper check
              </a>
            </dd>
          </>
        ) : null}
      </dl>
    </details>
  );
}

function formatTechnicalDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toISOString();
}

function stepLabel(id: LifecycleReceipt["steps"][number]["id"]): string {
  return {
    requested: "Requested",
    "host-accepted": "Host accepted",
    verified: "Verified",
    recorded: "Recorded",
  }[id];
}
