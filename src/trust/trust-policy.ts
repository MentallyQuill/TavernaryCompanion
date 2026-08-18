import {
  CURRENT_ASSESSMENT_WARNING,
  STALE_ASSESSMENT_WARNING,
  UNSANDBOXED_CODE_DISCLOSURE,
} from "./trust-copy";
import type { TrustPrompt, TrustPromptInput } from "./trust-types";

export function selectTrustPrompts({
  trustAcknowledgedAt,
  assessment,
}: TrustPromptInput): TrustPrompt[] {
  const prompts: TrustPrompt[] = [];
  if (!trustAcknowledgedAt) {
    prompts.push({
      kind: "unsandboxed-disclosure",
      copy: UNSANDBOXED_CODE_DISCLOSURE,
    });
  }
  if (assessment?.riskLevel === "material" || assessment?.riskLevel === "high") {
    const stale = assessment.freshness === "stale";
    prompts.push({
      kind: "assessment-warning",
      severity: assessment.riskLevel,
      stale,
      reportUrl: assessment.reportUrl,
      reviewDisabledReason: assessment.reportUrl
        ? null
        : "No TavernKeeper Scan Review link is available.",
      copy: stale ? STALE_ASSESSMENT_WARNING : CURRENT_ASSESSMENT_WARNING,
    });
  }
  return prompts;
}
