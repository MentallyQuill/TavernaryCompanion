import type { TavernKeeperFreshness, TavernKeeperRiskLevel } from "../catalog/catalog-core";

export interface AssessmentTrustInput {
  riskLevel: TavernKeeperRiskLevel | null;
  freshness: TavernKeeperFreshness;
  reportUrl: string | null;
}

export type TrustPrompt =
  | {
      kind: "unsandboxed-disclosure";
      copy: string;
    }
  | {
      kind: "assessment-warning";
      severity: "material" | "high";
      stale: boolean;
      reportUrl: string | null;
      reviewDisabledReason: string | null;
      copy: string;
    };

export interface TrustPromptInput {
  trustAcknowledgedAt: string | null;
  assessment: AssessmentTrustInput | null;
}
