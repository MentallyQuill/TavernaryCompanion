import type { KitWarning } from "../../kits/kit-plan";
import type { KitInstallTargetSelection } from "../../kits/kit-install-targets";
import { CURRENT_ASSESSMENT_WARNING } from "../../trust/trust-copy";

export function KitWarningGroup({
  warnings,
  selectedInstallTargets,
  onReview,
}: {
  warnings: readonly KitWarning[];
  selectedInstallTargets?: readonly KitInstallTargetSelection[];
  onReview(url: string): void;
}): preact.JSX.Element | null {
  if (!warnings.length) return null;
  const selected = new Map(
    (selectedInstallTargets ?? []).map((selection) => [selection.projectId, selection.target]),
  );
  return (
    <section class="tavernary-companion-kit-warnings" role="alert">
      <h3>Before you install</h3>
      <p>{CURRENT_ASSESSMENT_WARNING}</p>
      <ul>
        {warnings.map((warning) => (
          <li key={warning.projectId}>
            <span>
              <strong>{warning.projectName}</strong> ·{" "}
              {warning.severity === "high" ? "High concern" : "Needs a closer look"}
              {warningIsOlder(warning, selected.get(warning.projectId))
                ? " · TavernKeeper checked an older version"
                : ""}
            </span>
            {warning.reportUrl ? (
              <button type="button" onClick={() => onReview(warning.reportUrl!)}>
                View check
              </button>
            ) : (
              <span>No scan link available</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function warningIsOlder(
  warning: KitWarning,
  target: KitInstallTargetSelection["target"] | undefined,
): boolean {
  if (warning.scannedSha && target?.requestedSha) {
    return warning.scannedSha.toLowerCase() !== target.requestedSha.toLowerCase();
  }
  return warning.freshness === "stale";
}
