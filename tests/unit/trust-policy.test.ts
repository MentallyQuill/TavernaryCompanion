import { describe, expect, it } from "vitest";

import type { InstallTarget } from "../../src/lifecycle/install-target";
import {
  CURRENT_ASSESSMENT_WARNING,
  STALE_ASSESSMENT_WARNING,
  UNSANDBOXED_CODE_DISCLOSURE,
} from "../../src/trust/trust-copy";
import { selectTrustPrompts } from "../../src/trust/trust-policy";

const reportUrl = "https://tavernary.org/security/reports/alpha";
const checkedSha = "a".repeat(40);
const newestSha = "b".repeat(40);
const checkedTarget: InstallTarget = {
  kind: "checked",
  requestedSha: checkedSha,
  checkedAt: "2026-08-17T10:00:00.000Z",
  reportId: "report-123",
  reportUrl,
};

describe("trust prompt selection", () => {
  it("puts the one-time unsandboxed disclosure before a concern warning", () => {
    expect(
      selectTrustPrompts({
        trustAcknowledgedAt: null,
        target: checkedTarget,
        assessment: { riskLevel: "material", scannedSha: checkedSha, reportUrl },
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
          target: checkedTarget,
          assessment: { riskLevel, scannedSha: checkedSha, reportUrl },
        }),
      ).toEqual([expect.objectContaining({ kind: "assessment-warning", severity: riskLevel })]);
    }
  });

  it("uses the approved current and older-version warning copy", () => {
    expect(CURRENT_ASSESSMENT_WARNING).toBe(
      "TavernKeeper found concerns in this version. You can view the check before choosing whether to install it.",
    );
    expect(
      selectTrustPrompts({
        trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
        target: {
          kind: "newest",
          requestedSha: newestSha,
          resolvedAt: "2026-08-19T00:00:00.000Z",
        },
        assessment: { riskLevel: "material", scannedSha: checkedSha, reportUrl },
      }),
    ).toEqual([expect.objectContaining({ copy: STALE_ASSESSMENT_WARNING, stale: true })]);
    expect(STALE_ASSESSMENT_WARNING).toBe(
      "TavernKeeper checked an older version of this project. The newest changes have not been checked yet.",
    );
  });

  it("treats the selected revision as current whenever it equals the report SHA", () => {
    expect(
      selectTrustPrompts({
        trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
        target: {
          kind: "newest",
          requestedSha: checkedSha,
          resolvedAt: "2026-08-19T00:00:00.000Z",
        },
        assessment: { riskLevel: "high", scannedSha: checkedSha, reportUrl },
      }),
    ).toEqual([expect.objectContaining({ stale: false, copy: CURRENT_ASSESSMENT_WARNING })]);
  });

  it("does not warn for low, neutral, or unscanned states", () => {
    for (const assessment of [
      null,
      { riskLevel: null, scannedSha: null, reportUrl: null },
      { riskLevel: "low" as const, scannedSha: checkedSha, reportUrl },
    ]) {
      expect(
        selectTrustPrompts({
          trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
          target: checkedTarget,
          assessment,
        }),
      ).toEqual([]);
    }
  });

  it("keeps cancellation available when the check is unavailable", () => {
    expect(
      selectTrustPrompts({
        trustAcknowledgedAt: "2026-08-18T10:00:00.000Z",
        target: { kind: "newest", requestedSha: null, resolvedAt: null },
        assessment: { riskLevel: "high", scannedSha: checkedSha, reportUrl: null },
      }),
    ).toEqual([
      expect.objectContaining({
        kind: "assessment-warning",
        reportUrl: null,
        reviewDisabledReason: "No TavernKeeper check link is available.",
      }),
    ]);
  });
});
