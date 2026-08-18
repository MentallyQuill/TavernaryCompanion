import { describe, expect, it } from "vitest";

import {
  CURRENT_ASSESSMENT_WARNING,
  STALE_ASSESSMENT_WARNING,
  UNSANDBOXED_CODE_DISCLOSURE,
} from "../../src/trust/trust-copy";
import { selectTrustPrompts } from "../../src/trust/trust-policy";

const reportUrl = "https://tavernary.org/security/reports/alpha";

describe("trust prompt selection", () => {
  it("puts the one-time unsandboxed disclosure before a concern warning", () => {
    expect(
      selectTrustPrompts({
        trustAcknowledgedAt: null,
        assessment: { riskLevel: "material", freshness: "current", reportUrl },
      }),
    ).toEqual([
      { kind: "unsandboxed-disclosure", copy: UNSANDBOXED_CODE_DISCLOSURE },
      {
        kind: "assessment-warning",
        severity: "material",
        stale: false,
        reportUrl,
        reviewDisabledReason: null,
        copy: CURRENT_ASSESSMENT_WARNING,
      },
    ]);
  });

  it("warns on every material or high attempt even after acknowledgement", () => {
    for (const riskLevel of ["material", "high"] as const) {
      expect(
        selectTrustPrompts({
          trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
          assessment: { riskLevel, freshness: "current", reportUrl },
        }),
      ).toEqual([expect.objectContaining({ kind: "assessment-warning", severity: riskLevel })]);
    }
  });

  it("uses the approved current and older-version warning copy", () => {
    expect(CURRENT_ASSESSMENT_WARNING).toBe(
      "TavernKeeper’s latest assessment identified potential security concerns in this project. Extensions can run code inside SillyTavern. Responsibility for safety falls upon you. Review the scan and project before continuing.",
    );
    expect(
      selectTrustPrompts({
        trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
        assessment: { riskLevel: "material", freshness: "stale", reportUrl },
      }),
    ).toEqual([expect.objectContaining({ copy: STALE_ASSESSMENT_WARNING, stale: true })]);
    expect(STALE_ASSESSMENT_WARNING).toContain(
      "This assessment covers an older version of the project.",
    );
  });

  it("does not warn for low, neutral, or unscanned states", () => {
    for (const assessment of [
      null,
      { riskLevel: null, freshness: "unassessed" as const, reportUrl: null },
      { riskLevel: "low" as const, freshness: "current" as const, reportUrl },
    ]) {
      expect(
        selectTrustPrompts({
          trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
          assessment,
        }),
      ).toEqual([]);
    }
  });

  it("keeps cancellation available when Scan Review is unavailable", () => {
    expect(
      selectTrustPrompts({
        trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
        assessment: { riskLevel: "high", freshness: "unavailable", reportUrl: null },
      }),
    ).toEqual([
      expect.objectContaining({
        kind: "assessment-warning",
        reportUrl: null,
        reviewDisabledReason: "No TavernKeeper Scan Review link is available.",
      }),
    ]);
  });
});
