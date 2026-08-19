import type { TavernKeeperRiskLevel } from "../catalog/catalog-core";
import type { InstallTarget } from "../lifecycle/install-target";

export interface AssessmentTrustInput {
  riskLevel: TavernKeeperRiskLevel | null;
  scannedSha: string | null;
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
  target: InstallTarget;
  assessment: AssessmentTrustInput | null;
}
