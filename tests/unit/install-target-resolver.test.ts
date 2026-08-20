import { describe, expect, it } from "vitest";

import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import {
  NEWEST_LOOKUP_FAILED_REASON,
  createInstallTargetResolver,
  prepareNewestInstallTarget,
} from "../../src/lifecycle/install-target-resolver";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { createFakeHost } from "../helpers/fake-host";

const checkedSha = "a".repeat(40);
const newestSha = "b".repeat(40);
const checkedAt = "2026-08-17T10:00:00.000Z";

function projectWithReport(overrides: { scannedSha?: unknown; currentSha?: string | null } = {}) {
  const project = catalogProjectFixture();
  project.tavernKeeper = {
    state: "orange",
    riskLevel: "material",
    freshness: "stale",
    currentSha: overrides.currentSha ?? checkedSha,
    report: {
      reportId: "report-123",
      riskLevel: "material",
      headline: "Report",
      summary: "Report summary",
      minorCautions: 0,
      materialConcerns: 1,
      highDanger: 0,
      maliciousEvidence: "none",
      citedFindingIds: [],
      scannedSha: (overrides.scannedSha ?? checkedSha) as string,
      treeUrl: "https://example.test/tree",
      scannedAt: checkedAt,
      assessedAt: checkedAt,
      scannerPolicyVersion: "5",
      contextualReviewPolicyVersion: "1",
      synthesisPolicyVersion: "1",
      synthesisModel: "test",
      dangerBasis: "none",
      assessmentSource: "model",
      reportUrl: "https://example.test/reports/report-123",
      technicalHistoryUrl: null,
    },
    history: [],
    historyUrl: null,
  };
  return project;
}

function readySnapshot(project = catalogProjectFixture()): CatalogSnapshot {
  const catalog = catalogFixture();
  catalog.projects = [project];
  return {
    state: "ready-current",
    canMutate: true,
    checkedAt: "2026-08-19T00:00:00.000Z",
    catalog,
  };
}

function capableResolver(project = catalogProjectFixture()) {
  const host = createFakeHost({
    capabilities: {
      pinnedCommitInstall: true,
      remoteRevisionLookup: true,
      localRevisionLookup: true,
    },
    remoteHeads: { [`${project.install!.repositoryUrl}#`]: newestSha },
  });
  return {
    host,
    resolver: createInstallTargetResolver({
      host,
      snapshot: readySnapshot(project),
      now: () => "2026-08-19T12:00:00.000Z",
    }),
  };
}

describe("install target resolver", () => {
  it("prepares the resolved newest target when no usable report exists", async () => {
    const project = catalogProjectFixture();
    const { resolver } = capableResolver(project);

    await expect(resolver.prepare(project)).resolves.toMatchObject({
      kind: "single",
      target: { kind: "newest", requestedSha: newestSha, resolvedAt: "2026-08-19T12:00:00.000Z" },
    });
  });

  it("uses the checked target when the resolved newest revision matches the report", async () => {
    const project = projectWithReport({ scannedSha: newestSha, currentSha: newestSha });
    const { resolver } = capableResolver(project);

    await expect(resolver.prepare(project)).resolves.toMatchObject({
      kind: "single",
      target: {
        kind: "checked",
        requestedSha: newestSha,
        checkedAt,
        reportId: "report-123",
      },
    });
  });

  it("can freshly prepare Newest even when normal preparation collapses to Checked", async () => {
    const project = projectWithReport({ scannedSha: newestSha, currentSha: newestSha });
    const { host } = capableResolver(project);

    await expect(
      prepareNewestInstallTarget({
        host,
        snapshot: readySnapshot(project),
        project,
        now: () => "2026-08-19T12:00:00.000Z",
      }),
    ).resolves.toEqual({
      kind: "newest",
      requestedSha: newestSha,
      resolvedAt: "2026-08-19T12:00:00.000Z",
    });
  });

  it("offers checked and newest targets when the resolved revisions differ", async () => {
    const project = projectWithReport({ currentSha: checkedSha });
    const { resolver } = capableResolver(project);

    await expect(resolver.prepare(project)).resolves.toMatchObject({
      kind: "choose",
      checked: { target: { kind: "checked", requestedSha: checkedSha }, disabledReason: null },
      newest: { kind: "newest", requestedSha: newestSha },
    });
  });

  it("uses one executable newest target when a legacy host cannot install the scanned commit", async () => {
    const project = projectWithReport({ currentSha: newestSha });
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: false,
        remoteRevisionLookup: false,
        localRevisionLookup: true,
      },
    });
    const resolver = createInstallTargetResolver({ host, snapshot: readySnapshot(project) });

    await expect(resolver.prepare(project)).resolves.toEqual({
      kind: "single",
      target: { kind: "newest", requestedSha: null, resolvedAt: null },
    });
  });

  it("collapses matching legacy catalog evidence into a single newest target", async () => {
    const project = projectWithReport({ currentSha: checkedSha });
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: false,
        remoteRevisionLookup: false,
        localRevisionLookup: true,
      },
    });
    const resolver = createInstallTargetResolver({ host, snapshot: readySnapshot(project) });

    await expect(resolver.prepare(project)).resolves.toMatchObject({
      kind: "single",
      target: { kind: "newest", requestedSha: null, resolvedAt: null },
    });
  });

  it("treats a malformed report hash as no install report", async () => {
    const project = projectWithReport({ scannedSha: "not-a-commit", currentSha: newestSha });
    const { resolver } = capableResolver(project);

    await expect(resolver.prepare(project)).resolves.toMatchObject({
      kind: "single",
      target: { kind: "newest", requestedSha: newestSha },
    });
  });

  it("does not fall back to legacy newest when a capable newest lookup fails", async () => {
    const project = projectWithReport({ currentSha: checkedSha });
    const { host, resolver } = capableResolver(project);
    const failure = new Error("network unavailable");
    host.resolveRemoteRevision = async () => Promise.reject(failure);

    await expect(resolver.prepare(project)).rejects.toMatchObject({
      message: NEWEST_LOOKUP_FAILED_REASON,
      cause: failure,
    });
  });
});
