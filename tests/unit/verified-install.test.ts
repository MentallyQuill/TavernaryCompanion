import { describe, expect, it, vi } from "vitest";

import { HostRevisionUnavailableError } from "../../src/host/host-errors";
import type { InstallTarget } from "../../src/lifecycle/install-target";
import { VerifiedInstallError, executeVerifiedInstall } from "../../src/lifecycle/verified-install";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";
import { createFakeHost } from "../helpers/fake-host";

const checkedSha = "a".repeat(40);
const movedHeadSha = "b".repeat(40);
const mismatchedSha = "c".repeat(40);
const extension = {
  internalName: "third-party/Alpha",
  folderName: "Alpha",
  enabled: true,
  type: "local" as const,
  manifest: null,
};

const checkedTarget: InstallTarget = {
  kind: "checked",
  requestedSha: checkedSha,
  checkedAt: "2026-08-17T10:00:00.000Z",
  reportId: "report-123",
  reportUrl: "https://example.test/reports/report-123",
};

function fixture(options: Parameters<typeof createFakeHost>[0] = {}) {
  const project = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const host = createFakeHost({
    capabilities: {
      pinnedCommitInstall: true,
      remoteRevisionLookup: true,
      localRevisionLookup: true,
    },
    installResults: { [project.install!.repositoryUrl]: extension },
    ...options,
  });
  return { host, project };
}

describe("verified install", () => {
  it("installs and observes the exact checked revision", async () => {
    const { host, project } = fixture();

    await expect(executeVerifiedInstall({ host, project, target: checkedTarget })).resolves.toEqual(
      {
        extension,
        installedSha: checkedSha,
        cleanupOutcome: "not-needed",
      },
    );
    expect(host.calls).toContainEqual({
      operation: "install",
      repositoryUrl: project.install!.repositoryUrl,
      branch: null,
      commitSha: checkedSha,
    });
  });

  it("pins the prepared newest revision when the remote branch moves", async () => {
    const { host, project } = fixture({
      remoteHeads: { [`https://github.com/example/Alpha.git#`]: movedHeadSha },
    });
    const preparedTarget: InstallTarget = {
      kind: "newest",
      requestedSha: checkedSha,
      resolvedAt: "2026-08-19T09:00:00.000Z",
    };

    const result = await executeVerifiedInstall({ host, project, target: preparedTarget });

    expect(result.installedSha).toBe(checkedSha);
    expect(host.calls).toContainEqual(
      expect.objectContaining({ operation: "install", commitSha: checkedSha }),
    );
  });

  it("permits an unobservable local hash for legacy Newest", async () => {
    const { host, project } = fixture({
      capabilities: {
        pinnedCommitInstall: false,
        remoteRevisionLookup: false,
        localRevisionLookup: false,
      },
    });
    const legacyNewest: InstallTarget = {
      kind: "newest",
      requestedSha: null,
      resolvedAt: null,
    };

    await expect(executeVerifiedInstall({ host, project, target: legacyNewest })).resolves.toEqual({
      extension,
      installedSha: null,
      cleanupOutcome: "not-needed",
    });
    expect(host.calls).not.toContainEqual(
      expect.objectContaining({ operation: "readLocalRevision" }),
    );
  });

  it("cleans up a post-install revision mismatch and reports a typed failure", async () => {
    const { host, project } = fixture({
      mismatchResults: { [checkedSha]: mismatchedSha },
    });

    await expect(
      executeVerifiedInstall({ host, project, target: checkedTarget }),
    ).rejects.toMatchObject({
      name: "VerifiedInstallError",
      cleanupOutcome: "succeeded",
    } satisfies Partial<VerifiedInstallError>);
    expect(host.calls).toContainEqual({
      operation: "remove",
      internalName: extension.internalName,
      type: extension.type,
    });
    expect(
      (await host.discover()).some(({ folderName }) => folderName === extension.folderName),
    ).toBe(false);
  });

  it("reports cleanup failure as a typed failure rather than a success result", async () => {
    const { host, project } = fixture({
      mismatchResults: { [checkedSha]: mismatchedSha },
      failures: { remove: new Error("cleanup refused") },
    });

    await expect(
      executeVerifiedInstall({ host, project, target: checkedTarget }),
    ).rejects.toMatchObject({
      name: "VerifiedInstallError",
      cleanupOutcome: "failed",
    } satisfies Partial<VerifiedInstallError>);
  });

  it("treats any expected-folder remainder as failed cleanup", async () => {
    const { host, project } = fixture({
      mismatchResults: { [checkedSha]: mismatchedSha },
    });
    const discover = host.discover.bind(host);
    vi.spyOn(host, "discover").mockImplementation(async () => {
      const discovered = await discover();
      if (!host.calls.some(({ operation }) => operation === "remove")) return discovered;
      return [
        { ...extension, internalName: "third-party/Alpha-leftover-1" },
        { ...extension, internalName: "third-party/Alpha-leftover-2" },
      ];
    });

    await expect(
      executeVerifiedInstall({ host, project, target: checkedTarget }),
    ).rejects.toMatchObject({
      name: "VerifiedInstallError",
      cleanupOutcome: "failed",
    } satisfies Partial<VerifiedInstallError>);
  });

  it("propagates an unavailable selected revision without installing Newest", async () => {
    const { host, project } = fixture({ unavailableHashes: [checkedSha] });

    await expect(
      executeVerifiedInstall({ host, project, target: checkedTarget }),
    ).rejects.toBeInstanceOf(HostRevisionUnavailableError);
    expect(host.calls.filter(({ operation }) => operation === "install")).toEqual([
      expect.objectContaining({ commitSha: checkedSha }),
    ]);
  });
});
