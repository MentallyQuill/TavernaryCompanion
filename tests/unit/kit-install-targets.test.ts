import { describe, expect, it } from "vitest";

import { planKitOperation } from "../../src/kits/kit-planner";
import {
  computeInstallTargetBinding,
  initialInstallTargetSelections,
  prepareKitInstallTargets,
  validateInstallTargetApproval,
} from "../../src/kits/kit-install-targets";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { createFakeHost } from "../helpers/fake-host";

const checkedSha = "a".repeat(40);
const newestSha = "b".repeat(40);

describe("Kit install targets", () => {
  it("prepares single and real-choice targets before preflight", async () => {
    const same = scannedProject("same", "Same", checkedSha);
    const different = scannedProject("different", "Different", checkedSha);
    const unscanned = catalogProjectFixture({ id: "unscanned", folderName: "Unscanned" });
    const catalog = { ...catalogFixture(), projects: [same, different, unscanned] };
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      },
      remoteHeads: {
        [`${same.install!.repositoryUrl}#`]: checkedSha,
        [`${different.install!.repositoryUrl}#`]: newestSha,
        [`${unscanned.install!.repositoryUrl}#`]: newestSha,
      },
    });
    const plan = planKitOperation({
      operation: "install",
      kit: {
        id: "mixed",
        projectIds: ["same", "different", "unscanned"],
        origin: "personal",
      },
      catalog,
      inventory: { managed: [], external: [], unknown: [], missingManaged: [] },
      managed: {},
      installedKits: [],
      activeKitId: null,
      catalogCanMutate: true,
    });

    const prepared = await prepareKitInstallTargets({
      plan,
      catalog,
      host,
      now: () => "2026-08-19T12:00:00.000Z",
    });

    expect(
      prepared.install.map(({ projectId, targetChoice }) => [projectId, targetChoice?.kind]),
    ).toEqual([
      ["same", "single"],
      ["different", "choose"],
      ["unscanned", "single"],
    ]);
    expect(
      initialInstallTargetSelections(prepared).map(({ projectId, target }) => [
        projectId,
        target.kind,
      ]),
    ).toEqual([
      ["same", "checked"],
      ["unscanned", "newest"],
    ]);
    expect(Object.isFrozen(prepared.install[0].targetChoice)).toBe(true);
  });

  it("preselects the only executable target on a legacy host", async () => {
    const different = scannedProject("different", "Different", checkedSha);
    different.tavernKeeper!.currentSha = newestSha;
    const catalog = { ...catalogFixture(), projects: [different] };
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: false,
        remoteRevisionLookup: false,
        localRevisionLookup: true,
      },
    });
    const prepared = await prepareKitInstallTargets({
      plan: planKitOperation({
        operation: "install",
        kit: { id: "legacy", projectIds: ["different"], origin: "personal" },
        catalog,
        inventory: { managed: [], external: [], unknown: [], missingManaged: [] },
        managed: {},
        installedKits: [],
        activeKitId: null,
        catalogCanMutate: true,
      }),
      catalog,
      host,
    });
    const choice = prepared.install[0].targetChoice;
    expect(choice).toEqual({
      kind: "single",
      target: { kind: "newest", requestedSha: null, resolvedAt: null },
    });
    const newest = initialInstallTargetSelections(prepared);
    expect(newest).toEqual([
      {
        projectId: "different",
        target: { kind: "newest", requestedSha: null, resolvedAt: null },
      },
    ]);
    const binding = computeInstallTargetBinding(newest);

    expect(binding).toMatch(/^[0-9a-f]{64}$/u);
    expect(() => validateInstallTargetApproval(prepared, newest, binding)).not.toThrow();
    expect(() =>
      validateInstallTargetApproval(prepared, [], computeInstallTargetBinding([])),
    ).toThrow(/target/i);
    expect(() =>
      validateInstallTargetApproval(
        prepared,
        [
          {
            projectId: "different",
            target: { kind: "newest", requestedSha: newestSha, resolvedAt: null },
          },
        ],
        binding,
      ),
    ).toThrow(/target/i);
    expect(() => validateInstallTargetApproval(prepared, newest, "changed-binding")).toThrow(
      /binding/i,
    );
  });
});

function scannedProject(id: string, folderName: string, scannedSha: string) {
  const project = catalogProjectFixture({ id, folderName });
  project.tavernKeeper = {
    state: "teal",
    riskLevel: "low",
    freshness: "current",
    currentSha: scannedSha,
    history: [],
    historyUrl: null,
    report: {
      reportId: `report-${id}`,
      riskLevel: "low",
      headline: "Checked",
      summary: "Checked",
      minorCautions: 0,
      materialConcerns: 0,
      highDanger: 0,
      maliciousEvidence: "none",
      citedFindingIds: [],
      scannedSha,
      treeUrl: `https://example.com/${id}/tree`,
      scannedAt: "2026-08-17T00:00:00.000Z",
      assessedAt: "2026-08-17T00:01:00.000Z",
      scannerPolicyVersion: "5",
      contextualReviewPolicyVersion: "1",
      synthesisPolicyVersion: "1",
      synthesisModel: "fixture",
      dangerBasis: "none",
      assessmentSource: "model",
      reportUrl: `https://example.com/${id}/scan`,
      technicalHistoryUrl: null,
      javascriptAnalysisStatus: "complete",
    },
  };
  return project;
}
