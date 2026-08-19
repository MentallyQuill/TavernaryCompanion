import { describe, expect, it } from "vitest";

import {
  isFullCommitSha,
  legacyInstallProvenance,
  type InstallTarget,
} from "../../src/lifecycle/install-target";
import { createReceipt } from "../../src/lifecycle/operation-receipt";

describe("install targets", () => {
  it("recognizes only full commit SHAs", () => {
    expect(isFullCommitSha("a".repeat(40))).toBe(true);
    expect(isFullCommitSha("a".repeat(39))).toBe(false);
  });

  it("models checked and newest targets", () => {
    const checked: InstallTarget = {
      kind: "checked",
      requestedSha: "a".repeat(40),
      checkedAt: "2026-08-19T00:00:00.000Z",
      reportId: "report-123",
      reportUrl: "https://example.test/reports/report-123",
    };
    const newest: InstallTarget = {
      kind: "newest",
      requestedSha: null,
      resolvedAt: null,
    };

    expect(checked.kind).toBe("checked");
    expect(newest.kind).toBe("newest");
  });

  it("creates exact legacy provenance", () => {
    expect(legacyInstallProvenance()).toEqual({
      targetKind: "legacy-unknown",
      requestedSha: null,
      installedSha: null,
      catalogGeneratedAt: null,
      tavernKeeperReportId: null,
    });
  });

  it("includes optional install provenance and cleanup outcome in receipts", () => {
    const receipt = createReceipt({
      id: "receipt-1",
      kind: "install",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-19T00:00:00.000Z",
      finishedAt: "2026-08-19T00:00:01.000Z",
      status: "succeeded",
      safeError: null,
      reloadRequired: false,
      installProvenance: {
        targetKind: "checked",
        requestedSha: "a".repeat(40),
        installedSha: "b".repeat(40),
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        tavernKeeperReportId: "report-123",
      },
      cleanupOutcome: "not-needed",
    });

    expect(receipt.installProvenance).toMatchObject({ targetKind: "checked" });
    expect(receipt.cleanupOutcome).toBe("not-needed");
  });
});
