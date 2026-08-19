import type { KitWarning } from "../../kits/kit-plan";
import { CURRENT_ASSESSMENT_WARNING } from "../../trust/trust-copy";

export function KitWarningGroup({
  warnings,
  onReview,
}: {
  warnings: readonly KitWarning[];
  onReview(url: string): void;
}): preact.JSX.Element | null {
  if (!warnings.length) return null;
  return (
    <section class="tavernary-companion-kit-warnings" role="alert">
      <h3>Security concerns</h3>
      <p>{CURRENT_ASSESSMENT_WARNING}</p>
      <ul>
        {warnings.map((warning) => (
          <li key={warning.projectId}>
            <span>
              <strong>{warning.projectName}</strong> ·{" "}
              {warning.severity === "high" ? "Immediate danger" : "Potential concern"}
              {warning.freshness === "stale" ? " · stale assessment" : ""}
            </span>
            {warning.reportUrl ? (
              <button type="button" onClick={() => onReview(warning.reportUrl!)}>
                Scan Review
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
