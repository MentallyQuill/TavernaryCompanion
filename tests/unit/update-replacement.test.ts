import { describe, expect, it, vi } from "vitest";
import { createUpdateReplacement } from "../../src/updates/update-replacement";
import { OperationLock } from "../../src/lifecycle/operation-lock";

function setup() {
  const extension = {
    internalName: "third-party/Alpha",
    folderName: "Alpha",
    type: "local",
    enabled: false,
  };
  const host = {
    inspectLocalChanges: vi.fn(async () => ({
      fingerprint: "files-1",
      installedSha: "1".repeat(40),
      conflicting: true,
    })),
    getInstallCapabilities: vi.fn(async () => ({
      pinnedCommitInstall: true,
      localRevisionLookup: true,
    })),
    discover: vi.fn(async () => [extension]),
    readLocalRevision: vi.fn(async () => "2".repeat(40)),
    remove: vi.fn(async () => {
      host.discover.mockResolvedValue([]);
    }),
    install: vi.fn(async () => {
      host.discover.mockResolvedValue([extension]);
    }),
    disable: vi.fn(),
    enable: vi.fn(),
  };
  const selection = {
    target: { kind: "newest", requestedSha: "2".repeat(40), resolvedAt: null },
    binding: {
      projectId: "alpha",
      internalName: extension.internalName,
      installedSha: "1".repeat(40),
      requestedSha: "2".repeat(40),
      repositoryUrl: "https://github.com/test/Alpha",
      branch: "main",
      catalogGeneratedAt: "today",
    },
  };
  const recovery = createUpdateReplacement({ host: host as any, lock: new OperationLock() });
  return { host, selection: selection as any, recovery };
}

describe("update replacement", () => {
  it("keeps an installation-only retry if discovery fails after confirmed removal", async () => {
    const { host, selection, recovery } = setup();
    await recovery.offer("receipt", selection, "Alpha");
    host.remove.mockImplementationOnce(async () => {
      host.discover.mockResolvedValue([]).mockRejectedValueOnce(new Error("offline"));
    });
    expect((await recovery.replace("receipt")).replacementRecovery).toBe("retry-install");
    expect((await recovery.replace("receipt")).status).toBe("succeeded");
    expect(host.remove).toHaveBeenCalledOnce();
  });
  it("continues installation if removal succeeded but its response failed", async () => {
    const { host, selection, recovery } = setup();
    await recovery.offer("receipt", selection, "Alpha");
    host.remove.mockImplementationOnce(async () => {
      host.discover.mockResolvedValue([]);
      throw new Error("response lost");
    });
    expect((await recovery.replace("receipt")).status).toBe("succeeded");
    expect(host.remove).toHaveBeenCalledOnce();
  });
  it("returns a verification receipt and restores disabled state when revision lookup fails", async () => {
    const { host, selection, recovery } = setup();
    await recovery.offer("receipt", selection, "Alpha");
    host.readLocalRevision.mockRejectedValueOnce(new Error("offline"));
    expect((await recovery.replace("receipt")).status).toBe("verification-failed");
    expect(host.disable).toHaveBeenCalledOnce();
  });
  it("reports enabled-state restoration failure without claiming success", async () => {
    const { host, selection, recovery } = setup();
    await recovery.offer("receipt", selection, "Alpha");
    host.disable.mockRejectedValueOnce(new Error("offline"));
    const result = await recovery.replace("receipt");
    expect(result.status).toBe("verification-failed");
    expect(result.safeError).toMatch(/enabled setting/);
  });
  it("requires confirmed conflicting files and an explicit replacement call", async () => {
    const { host, selection, recovery } = setup();
    expect(await recovery.offer("receipt", selection, "Alpha")).toBe(true);
    expect(host.remove).not.toHaveBeenCalled();
    const result = await recovery.replace("receipt");
    expect(result.status).toBe("succeeded");
    expect(host.install).toHaveBeenCalledWith({
      repositoryUrl: selection.binding.repositoryUrl,
      branch: "main",
      commitSha: selection.target.requestedSha,
    });
    expect(host.disable).toHaveBeenCalledWith("third-party/Alpha");
    await expect(recovery.replace("receipt")).rejects.toThrow();
  });
  it("never offers destructive recovery for unknown or nonconflicting failures", async () => {
    const { host, selection, recovery } = setup();
    host.inspectLocalChanges.mockResolvedValue({
      fingerprint: "files-1",
      installedSha: "1".repeat(40),
      conflicting: false,
    });
    expect(await recovery.offer("receipt", selection, "Alpha")).toBe(false);
    await expect(recovery.replace("receipt")).rejects.toThrow();
    expect(host.remove).not.toHaveBeenCalled();
  });
  it("rejects changed files since confirmation without deleting anything", async () => {
    const { host, selection, recovery } = setup();
    await recovery.offer("receipt", selection, "Alpha");
    host.inspectLocalChanges.mockResolvedValue({
      fingerprint: "files-2",
      installedSha: "1".repeat(40),
      conflicting: true,
    });
    await expect(recovery.replace("receipt")).rejects.toThrow(/changed/);
    expect(host.remove).not.toHaveBeenCalled();
  });
  it("keeps an installation-only retry after removal succeeds and installation fails", async () => {
    const { host, selection, recovery } = setup();
    await recovery.offer("receipt", selection, "Alpha");
    host.install.mockRejectedValueOnce(new Error("offline"));
    const failed = await recovery.replace("receipt");
    expect(failed.replacementRecovery).toBe("retry-install");
    expect(failed.safeError).toMatch(/removed/);
    expect((await recovery.replace("receipt")).status).toBe("succeeded");
    expect(host.remove).toHaveBeenCalledTimes(1);
  });
  it("checks pinned installation support before deleting", async () => {
    const { host, selection, recovery } = setup();
    await recovery.offer("receipt", selection, "Alpha");
    host.getInstallCapabilities.mockResolvedValue({
      pinnedCommitInstall: false,
      localRevisionLookup: true,
    });
    await expect(recovery.replace("receipt")).rejects.toThrow(/version/);
    expect(host.remove).not.toHaveBeenCalled();
  });
});
