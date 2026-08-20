import { describe, expect, it } from "vitest";

import { catalogProjectFixture } from "../helpers/catalog-fixtures";
import {
  bindUpdateSelection,
  deriveUpdateAvailability,
  matchesUpdateBinding,
  sameRepositoryUrl,
} from "../../src/updates/update-targets";

const installedSha = "1".repeat(40);
const checkedSha = "2".repeat(40);
const newestSha = "3".repeat(40);

describe("sameRepositoryUrl", () => {
  it("treats an HTTPS repository's trailing slash and .git suffix as insignificant", () => {
    expect(
      sameRepositoryUrl("https://GitHub.com/Owner/Repo.git", "https://github.com/Owner/Repo/"),
    ).toBe(true);
  });

  it("does not collapse repositories served from different ports", () => {
    expect(
      sameRepositoryUrl("https://code.example:8443/owner/repo", "https://code.example/owner/repo"),
    ).toBe(false);
  });
});

describe("deriveUpdateAvailability", () => {
  it("offers distinct scanned and newest commits when both are proven forward", () => {
    const project = catalogProjectFixture();
    project.tavernKeeper = tavernKeeper(checkedSha);

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha,
          remoteUrl: project.install!.repositoryUrl,
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "behind",
          candidateRelationships: { [checkedSha]: "behind" },
        },
      }),
    ).toMatchObject({
      kind: "available",
      notice: null,
      targets: [
        { kind: "checked", requestedSha: checkedSha },
        { kind: "newest", requestedSha: newestSha },
      ],
    });
  });

  it("deduplicates a scanned commit that is also the newest commit", () => {
    const project = catalogProjectFixture();
    project.tavernKeeper = tavernKeeper(checkedSha);

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha: checkedSha,
          remoteUrl: project.install!.repositoryUrl,
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "behind",
          candidateRelationships: { [checkedSha]: "behind" },
        },
      }),
    ).toMatchObject({
      kind: "available",
      targets: [{ kind: "checked", requestedSha: checkedSha }],
    });
  });

  it("explains when the installed commit already equals the latest scanned commit", () => {
    const project = catalogProjectFixture();
    project.tavernKeeper = tavernKeeper(installedSha);

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha,
          remoteUrl: project.install!.repositoryUrl,
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "behind",
          candidateRelationships: { [installedSha]: "equal" },
        },
      }),
    ).toMatchObject({
      kind: "available",
      notice: "You already have the latest scanned version.",
      targets: [{ kind: "newest", requestedSha: newestSha }],
    });
  });

  it("refuses to update an extension with local worktree changes", () => {
    const project = catalogProjectFixture();

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha,
          remoteUrl: project.install!.repositoryUrl,
          branch: "main",
          worktreeClean: false,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "behind",
          candidateRelationships: {},
        },
      }),
    ).toEqual({
      kind: "attention",
      reason:
        "This extension has local file changes, so Companion won’t overwrite them. Review those changes, then check again.",
    });
  });

  it("refuses to update when the installed Git origin does not match the catalog", () => {
    const project = catalogProjectFixture();

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha,
          remoteUrl: "https://github.com/another/repository.git",
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "behind",
          candidateRelationships: {},
        },
      }),
    ).toEqual({
      kind: "attention",
      reason:
        "This extension was installed from a different repository than Tavernary lists. Review it in SillyTavern or reinstall the Tavernary version.",
    });
  });

  it("refuses to update an extension checked out on an unexpected branch", () => {
    const project = catalogProjectFixture();

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha,
          remoteUrl: project.install!.repositoryUrl,
          branch: "experimental",
          worktreeClean: true,
          branchMatches: false,
          exactUpdateSupported: true,
          newestRelationship: "behind",
          candidateRelationships: {},
        },
      }),
    ).toEqual({
      kind: "attention",
      reason:
        "This extension is on the experimental branch, but Tavernary tracks the repository’s default branch. Switch branches in SillyTavern, then check again.",
    });
  });

  it("offers the native newest update when exact host updates are unavailable", () => {
    const project = catalogProjectFixture();

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha,
          remoteUrl: project.install!.repositoryUrl,
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: false,
          newestRelationship: "behind",
          candidateRelationships: {},
        },
      }),
    ).toEqual({
      kind: "available",
      notice: null,
      targets: [{ kind: "newest", requestedSha: null, resolvedAt: null }],
    });
  });

  it("marks a native up-to-date result without turning it into attention", () => {
    const project = catalogProjectFixture();

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha: null,
          remoteUrl: project.install!.repositoryUrl,
          branch: "main",
          worktreeClean: null,
          branchMatches: true,
          exactUpdateSupported: false,
          newestRelationship: "equal",
          candidateRelationships: {},
        },
      }),
    ).toEqual({ kind: "current", native: true });
  });

  it("hands off an extension whose installed history diverged from newest", () => {
    const project = catalogProjectFixture();

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha,
          remoteUrl: project.install!.repositoryUrl,
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "diverged",
          candidateRelationships: {},
        },
      }),
    ).toEqual({
      kind: "attention",
      reason:
        "This extension and the Tavernary version each contain different commits, so Companion won’t merge them. Resolve the branch in SillyTavern, then check again.",
    });
  });

  it("does not call an installed-ahead checkout current", () => {
    const project = catalogProjectFixture();

    expect(
      deriveUpdateAvailability({
        project,
        inspection: {
          installedSha,
          newestSha,
          remoteUrl: project.install!.repositoryUrl,
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "ahead",
          candidateRelationships: {},
        },
      }),
    ).toEqual({
      kind: "attention",
      reason:
        "This extension contains commits that aren’t in the Tavernary version, so Companion won’t replace them. Review it in SillyTavern, then check again.",
    });
  });
});

describe("bindUpdateSelection", () => {
  it("binds an update target to the exact installed and catalog state", () => {
    const project = catalogProjectFixture();

    expect(
      bindUpdateSelection({
        project,
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        internalName: "third-party/Alpha",
        installedSha,
        target: {
          kind: "newest",
          requestedSha: newestSha,
          resolvedAt: "2026-08-19T01:00:00.000Z",
        },
      }),
    ).toEqual({
      target: {
        kind: "newest",
        requestedSha: newestSha,
        resolvedAt: "2026-08-19T01:00:00.000Z",
      },
      binding: {
        projectId: "alpha",
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        internalName: "third-party/Alpha",
        installedSha,
        repositoryUrl: "https://github.com/example/Alpha.git",
        branch: null,
        requestedSha: newestSha,
      },
    });
  });

  it("rejects a prepared target after the installed commit changes", () => {
    const project = catalogProjectFixture();
    const selection = bindUpdateSelection({
      project,
      catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
      internalName: "third-party/Alpha",
      installedSha,
      target: {
        kind: "newest",
        requestedSha: newestSha,
        resolvedAt: "2026-08-19T01:00:00.000Z",
      },
    });

    expect(
      matchesUpdateBinding(selection, {
        project,
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        internalName: "third-party/Alpha",
        installedSha: "4".repeat(40),
      }),
    ).toBe(false);
  });

  it("rejects a prepared target when its selected commit no longer matches its binding", () => {
    const project = catalogProjectFixture();
    const selection = bindUpdateSelection({
      project,
      catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
      internalName: "third-party/Alpha",
      installedSha,
      target: {
        kind: "newest",
        requestedSha: newestSha,
        resolvedAt: "2026-08-19T01:00:00.000Z",
      },
    });
    selection.target.requestedSha = "4".repeat(40);

    expect(
      matchesUpdateBinding(selection, {
        project,
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        internalName: "third-party/Alpha",
        installedSha,
      }),
    ).toBe(false);
  });

  it("rejects a prepared target after the catalog generation changes", () => {
    const project = catalogProjectFixture();
    const selection = bindUpdateSelection({
      project,
      catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
      internalName: "third-party/Alpha",
      installedSha,
      target: {
        kind: "newest",
        requestedSha: newestSha,
        resolvedAt: "2026-08-19T01:00:00.000Z",
      },
    });

    expect(
      matchesUpdateBinding(selection, {
        project,
        catalogGeneratedAt: "2026-08-19T02:00:00.000Z",
        internalName: "third-party/Alpha",
        installedSha,
      }),
    ).toBe(false);
  });

  it("rejects a prepared target after the catalog repository changes", () => {
    const project = catalogProjectFixture();
    const selection = bindUpdateSelection({
      project,
      catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
      internalName: "third-party/Alpha",
      installedSha,
      target: {
        kind: "newest",
        requestedSha: newestSha,
        resolvedAt: "2026-08-19T01:00:00.000Z",
      },
    });
    project.install = { ...project.install!, repositoryUrl: "https://github.com/example/Beta.git" };

    expect(
      matchesUpdateBinding(selection, {
        project,
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        internalName: "third-party/Alpha",
        installedSha,
      }),
    ).toBe(false);
  });

  it("rejects a prepared target after the installed extension identity changes", () => {
    const project = catalogProjectFixture();
    const selection = bindUpdateSelection({
      project,
      catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
      internalName: "third-party/Alpha",
      installedSha,
      target: {
        kind: "newest",
        requestedSha: newestSha,
        resolvedAt: "2026-08-19T01:00:00.000Z",
      },
    });

    expect(
      matchesUpdateBinding(selection, {
        project,
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        internalName: "third-party/Other",
        installedSha,
      }),
    ).toBe(false);
  });

  it("rejects a prepared target for another catalog project", () => {
    const project = catalogProjectFixture();
    const selection = bindUpdateSelection({
      project,
      catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
      internalName: "third-party/Alpha",
      installedSha,
      target: {
        kind: "newest",
        requestedSha: newestSha,
        resolvedAt: "2026-08-19T01:00:00.000Z",
      },
    });

    expect(
      matchesUpdateBinding(selection, {
        project: catalogProjectFixture({ id: "beta", folderName: "Alpha" }),
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        internalName: "third-party/Alpha",
        installedSha,
      }),
    ).toBe(false);
  });

  it("rejects a prepared target after the catalog branch changes", () => {
    const project = catalogProjectFixture();
    const selection = bindUpdateSelection({
      project,
      catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
      internalName: "third-party/Alpha",
      installedSha,
      target: {
        kind: "newest",
        requestedSha: newestSha,
        resolvedAt: "2026-08-19T01:00:00.000Z",
      },
    });
    project.install = { ...project.install!, branch: "stable" };

    expect(
      matchesUpdateBinding(selection, {
        project,
        catalogGeneratedAt: "2026-08-19T00:00:00.000Z",
        internalName: "third-party/Alpha",
        installedSha,
      }),
    ).toBe(false);
  });
});

function tavernKeeper(scannedSha: string) {
  return {
    state: "teal" as const,
    riskLevel: "low" as const,
    freshness: "stale" as const,
    currentSha: newestSha,
    report: {
      reportId: "report-alpha",
      riskLevel: "low" as const,
      headline: "Checked",
      summary: "Checked",
      minorCautions: 0,
      materialConcerns: 0,
      highDanger: 0,
      maliciousEvidence: "",
      citedFindingIds: [],
      scannedSha,
      treeUrl: "https://example.com/tree",
      scannedAt: "2026-08-17T00:00:00.000Z",
      assessedAt: "2026-08-17T00:00:00.000Z",
      scannerPolicyVersion: "5",
      contextualReviewPolicyVersion: "1",
      synthesisPolicyVersion: "1",
      synthesisModel: "model",
      dangerBasis: "none" as const,
      assessmentSource: "model" as const,
      reportUrl: "https://example.com/report",
      technicalHistoryUrl: null,
    },
    history: [],
    historyUrl: null,
  };
}
