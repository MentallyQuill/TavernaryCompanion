import { describe, expect, it, vi } from "vitest";

import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import { HostRevisionUnavailableError } from "../../src/host/host-errors";
import { createLifecycleCoordinator } from "../../src/lifecycle/lifecycle-coordinator";
import { OperationInProgressError } from "../../src/lifecycle/operation-lock";
import { COMPANION_PROJECT_ID } from "../../src/lifecycle/self-protection";
import { ProfileStore } from "../../src/state/profile-store";
import type { TrustPrompt } from "../../src/trust/trust-types";
import { createFakeHost } from "../helpers/fake-host";
import { catalogFixture, catalogProjectFixture, deferred } from "../helpers/catalog-fixtures";

const checkedSha = "a".repeat(40);
const mismatchedSha = "b".repeat(40);

function attachReport(
  project: ReturnType<typeof catalogProjectFixture>,
  reportId: string,
  scannedSha: string,
): void {
  project.tavernKeeper = {
    state: "orange",
    riskLevel: "material",
    freshness: "current",
    currentSha: scannedSha,
    report: {
      reportId,
      riskLevel: "material",
      headline: "Report",
      summary: "Report summary",
      minorCautions: 0,
      materialConcerns: 1,
      highDanger: 0,
      maliciousEvidence: "none",
      citedFindingIds: [],
      scannedSha,
      treeUrl: `https://example.test/tree/${scannedSha}`,
      scannedAt: "2026-08-17T10:00:00.000Z",
      assessedAt: "2026-08-17T10:00:00.000Z",
      scannerPolicyVersion: "5",
      contextualReviewPolicyVersion: "1",
      synthesisPolicyVersion: "1",
      synthesisModel: "test",
      dangerBasis: "none",
      assessmentSource: "model",
      reportUrl: `https://example.test/reports/${reportId}`,
      technicalHistoryUrl: null,
    },
    history: [],
    historyUrl: null,
  };
}

function setup({
  folderName = "Alpha",
  saveSettings = vi.fn(),
  confirm = vi.fn(async () => true),
  createId = () => "receipt-1",
}: {
  folderName?: string;
  saveSettings?: () => void | Promise<void>;
  confirm?: (prompt: TrustPrompt) => Promise<boolean>;
  createId?: (() => string) | null;
} = {}) {
  const project = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  project.name = "Alpha";
  const catalog = catalogFixture();
  catalog.projects = [project];
  const snapshot: CatalogSnapshot = {
    state: "ready-current",
    canMutate: true,
    checkedAt: null,
    catalog,
  };
  const host = createFakeHost({
    installResults: {
      [project.install!.repositoryUrl]: {
        internalName: `third-party/${folderName}`,
        folderName,
        enabled: true,
        type: "local",
        manifest: null,
      },
    },
  });
  const extensionSettings: Record<string, unknown> = {};
  const store = new ProfileStore({ extensionSettings, saveSettings });
  const coordinator = createLifecycleCoordinator({
    host,
    store,
    getSnapshot: () => snapshot,
    confirm,
    now: () => "2026-08-18T10:00:00.000Z",
    ...(createId ? { createId } : {}),
  });
  return { coordinator, host, store, project, extensionSettings, confirm };
}

async function prepareSingleSelection(
  coordinator: ReturnType<typeof createLifecycleCoordinator>,
  projectId = "alpha",
) {
  const prepared = await coordinator.prepareInstall(projectId);
  if (prepared.kind !== "single") throw new Error("Expected one prepared selection.");
  return prepared.selection;
}

describe("install lifecycle", () => {
  it("installs when randomUUID is unavailable in an insecure browser context", async () => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });

    try {
      const { coordinator } = setup({ createId: null });
      const selection = await prepareSingleSelection(coordinator);

      const receipt = await coordinator.install("alpha", selection);

      expect(receipt).toMatchObject({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        ),
        status: "succeeded",
      });
    } finally {
      Reflect.deleteProperty(globalThis.crypto, "randomUUID");
    }
  });

  it("installs, rediscovers, and records only verified ownership", async () => {
    const { coordinator, host, store, project } = setup();

    const selection = await prepareSingleSelection(coordinator);
    const receipt = await coordinator.install("alpha", selection);

    expect(host.calls.map(({ operation }) => operation)).toEqual([
      "getInstallCapabilities",
      "discover",
      "discover",
      "getInstallCapabilities",
      "install",
      "discover",
      "readLocalRevision",
    ]);
    expect(host.calls).toContainEqual(
      expect.objectContaining({
        repositoryUrl: project.install!.repositoryUrl,
        branch: null,
      }),
    );
    expect(receipt.status).toBe("succeeded");
    expect(store.read().managedExtensions.alpha).toMatchObject({
      projectId: "alpha",
      folderName: "Alpha",
    });
    expect(store.read().trustAcknowledgedAt).toBe("2026-08-18T10:00:00.000Z");
  });

  it("cancels before the host install call and persists no acknowledgement", async () => {
    const { coordinator, host, store } = setup({ confirm: vi.fn(async () => false) });
    const selection = await prepareSingleSelection(coordinator);
    const receipt = await coordinator.install("alpha", selection);

    expect(receipt.status).toBe("cancelled");
    expect(host.calls.map(({ operation }) => operation)).toEqual([
      "getInstallCapabilities",
      "discover",
    ]);
    expect(store.read().trustAcknowledgedAt).toBeNull();
    expect(store.read().managedExtensions).toEqual({});
  });

  it("does not record ownership when rediscovery finds the wrong folder", async () => {
    const { coordinator, store } = setup({ folderName: "Wrong" });
    const selection = await prepareSingleSelection(coordinator);
    const receipt = await coordinator.install("alpha", selection);

    expect(receipt.status).toBe("verification-failed");
    expect(store.read().managedExtensions).toEqual({});
  });

  it("returns a safe host failure receipt", async () => {
    const fixture = setup();
    vi.spyOn(fixture.host, "install").mockRejectedValue(new Error("host refused token=secret"));
    const selection = await prepareSingleSelection(fixture.coordinator);
    const receipt = await fixture.coordinator.install("alpha", selection);

    expect(receipt.status).toBe("failed");
    expect(receipt.safeError).toBe("SillyTavern did not complete the install request.");
    expect(JSON.stringify(receipt)).not.toContain("secret");
  });

  it("rejects an accidental concurrent request instead of queuing it", async () => {
    const pending = deferred<boolean>();
    const fixture = setup({ confirm: vi.fn(() => pending.promise) });
    const selection = await prepareSingleSelection(fixture.coordinator);
    const first = fixture.coordinator.install("alpha", selection);
    await vi.waitFor(() => expect(fixture.host.calls).toHaveLength(2));

    await expect(fixture.coordinator.install("alpha", selection)).rejects.toThrow(
      OperationInProgressError,
    );
    pending.resolve(false);
    await first;
  });

  it("reports installed-unrecorded when profile persistence fails after verification", async () => {
    const fixture = setup({
      saveSettings: vi.fn().mockRejectedValue(new Error("storage unavailable")),
    });
    const selection = await prepareSingleSelection(fixture.coordinator);
    const receipt = await fixture.coordinator.install("alpha", selection);

    expect(receipt.status).toBe("installed-unrecorded");
    expect(receipt.safeError).toMatch(/reopen Companion/i);
    expect(fixture.store.read().managedExtensions).toEqual({});
  });

  it("records exact checked provenance only after local revision verification", async () => {
    const fixture = setup();
    attachReport(fixture.project, "report-123", checkedSha);
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      },
      installResults: {
        [fixture.project.install!.repositoryUrl]: {
          internalName: "third-party/Alpha",
          folderName: "Alpha",
          enabled: true,
          type: "local",
          manifest: null,
        },
      },
      remoteHeads: { [`${fixture.project.install!.repositoryUrl}#`]: checkedSha },
    });
    const coordinator = createLifecycleCoordinator({
      host,
      store: fixture.store,
      getSnapshot: () => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: null,
        catalog: { ...catalogFixture(), projects: [fixture.project] },
      }),
      confirm: async () => true,
      now: () => "2026-08-19T12:00:00.000Z",
      createId: () => "checked-receipt",
    });

    const selection = await prepareSingleSelection(coordinator);
    const receipt = await coordinator.install("alpha", selection);

    expect(host.calls).toContainEqual(
      expect.objectContaining({ operation: "install", commitSha: checkedSha }),
    );
    expect(receipt.installProvenance).toMatchObject({
      targetKind: "checked",
      requestedSha: checkedSha,
      installedSha: checkedSha,
      tavernKeeperReportId: "report-123",
    });
    expect(fixture.store.read().managedExtensions.alpha).toMatchObject({
      provenance: receipt.installProvenance,
    });
  });

  it("reports an unavailable pinned verification capability before host acceptance", async () => {
    const fixture = setup();
    const resolvedSha = "c".repeat(40);
    const catalog = catalogFixture("2026-08-19T00:00:00.000Z");
    catalog.projects = [fixture.project];
    const snapshot: CatalogSnapshot = {
      state: "ready-current",
      canMutate: true,
      checkedAt: "2026-08-19T00:05:00.000Z",
      catalog,
    };
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: false,
      },
      remoteHeads: { [`${fixture.project.install!.repositoryUrl}#`]: resolvedSha },
    });
    const coordinator = createLifecycleCoordinator({
      host,
      store: fixture.store,
      getSnapshot: () => snapshot,
      confirm: async () => true,
    });
    const selection = await prepareSingleSelection(coordinator);
    host.calls.length = 0;

    const receipt = await coordinator.install("alpha", selection);

    expect(receipt).toMatchObject({
      status: "failed",
      cleanupOutcome: "not-needed",
      safeError: "SillyTavern can't verify the selected version, so Companion did not install it.",
      steps: [
        { id: "requested", status: "succeeded" },
        { id: "host-accepted", status: "failed" },
        { id: "verified", status: "pending" },
        { id: "recorded", status: "pending" },
      ],
    });
    expect(host.calls.filter(({ operation }) => operation === "install")).toEqual([]);
    expect(fixture.store.read().managedExtensions).toEqual({});
  });

  it("returns the cleaned-up failure receipt and keeps ownership empty after a SHA mismatch", async () => {
    const fixture = setup();
    attachReport(fixture.project, "report-123", checkedSha);
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      },
      installResults: {
        [fixture.project.install!.repositoryUrl]: {
          internalName: "third-party/Alpha",
          folderName: "Alpha",
          enabled: true,
          type: "local",
          manifest: null,
        },
      },
      mismatchResults: { [checkedSha]: mismatchedSha },
      remoteHeads: { [`${fixture.project.install!.repositoryUrl}#`]: checkedSha },
    });
    const coordinator = createLifecycleCoordinator({
      host,
      store: fixture.store,
      getSnapshot: () => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: null,
        catalog: { ...catalogFixture(), projects: [fixture.project] },
      }),
      confirm: async () => true,
    });

    const selection = await prepareSingleSelection(coordinator);
    const receipt = await coordinator.install("alpha", selection);

    expect(receipt).toMatchObject({
      status: "verification-failed",
      cleanupOutcome: "succeeded",
      safeError: "The install didn't finish correctly, so Companion cleaned it up.",
    });
    expect(fixture.store.read().managedExtensions).toEqual({});
    expect(host.calls).toContainEqual(expect.objectContaining({ operation: "remove" }));
  });

  it("requests attention and remains unowned when mismatch cleanup fails", async () => {
    const fixture = setup();
    attachReport(fixture.project, "report-123", checkedSha);
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      },
      installResults: {
        [fixture.project.install!.repositoryUrl]: {
          internalName: "third-party/Alpha",
          folderName: "Alpha",
          enabled: true,
          type: "local",
          manifest: null,
        },
      },
      mismatchResults: { [checkedSha]: mismatchedSha },
      remoteHeads: { [`${fixture.project.install!.repositoryUrl}#`]: checkedSha },
      failures: { remove: new Error("cleanup refused") },
    });
    const coordinator = createLifecycleCoordinator({
      host,
      store: fixture.store,
      getSnapshot: () => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: null,
        catalog: { ...catalogFixture(), projects: [fixture.project] },
      }),
      confirm: async () => true,
    });

    const selection = await prepareSingleSelection(coordinator);
    const receipt = await coordinator.install("alpha", selection);

    expect(receipt.status).toBe("verification-failed");
    expect(receipt.cleanupOutcome).toBe("failed");
    expect(receipt.safeError).toMatch(/needs attention/i);
    expect(fixture.store.read().managedExtensions).toEqual({});
  });

  it("propagates an unavailable checked revision for the fallback broker", async () => {
    const fixture = setup();
    attachReport(fixture.project, "report-123", checkedSha);
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      },
      installResults: {
        [fixture.project.install!.repositoryUrl]: {
          internalName: "third-party/Alpha",
          folderName: "Alpha",
          enabled: true,
          type: "local",
          manifest: null,
        },
      },
      unavailableHashes: [checkedSha],
      remoteHeads: { [`${fixture.project.install!.repositoryUrl}#`]: checkedSha },
    });
    const coordinator = createLifecycleCoordinator({
      host,
      store: fixture.store,
      getSnapshot: () => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: null,
        catalog: { ...catalogFixture(), projects: [fixture.project] },
      }),
      confirm: async () => true,
    });

    const selection = await prepareSingleSelection(coordinator);
    await expect(coordinator.install("alpha", selection)).rejects.toBeInstanceOf(
      HostRevisionUnavailableError,
    );
    expect(host.calls.filter(({ operation }) => operation === "install")).toEqual([
      expect.objectContaining({ commitSha: checkedSha }),
    ]);
    expect(fixture.store.read().managedExtensions).toEqual({});
  });

  it("prepares the current project's resolved install target before mutation", async () => {
    const project = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
    const catalog = catalogFixture();
    catalog.projects = [project];
    const snapshot: CatalogSnapshot = {
      state: "ready-current",
      canMutate: true,
      checkedAt: "2026-08-19T00:00:00.000Z",
      catalog,
    };
    const host = createFakeHost({
      capabilities: {
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      },
      remoteHeads: { [`${project.install!.repositoryUrl}#`]: "c".repeat(40) },
    });
    const coordinator = createLifecycleCoordinator({
      host,
      store: new ProfileStore({ extensionSettings: {}, saveSettings: () => undefined }),
      getSnapshot: () => snapshot,
      confirm: async () => true,
      now: () => "2026-08-19T12:00:00.000Z",
    });

    await expect(coordinator.prepareInstall("alpha")).resolves.toMatchObject({
      kind: "single",
      selection: {
        target: { kind: "newest", requestedSha: "c".repeat(40) },
        binding: {
          projectId: "alpha",
          catalogGeneratedAt: catalog.generatedAt,
          install: project.install,
          report: null,
        },
      },
    });
  });

  it.each(["project ID", "install contract", "catalog generation", "report identity"])(
    "rejects a prepared selection when refreshed %s drifts before install",
    async (drift) => {
      const project = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
      attachReport(project, "report-old", checkedSha);
      const catalog = catalogFixture("2026-08-19T00:00:00.000Z");
      catalog.projects = [project];
      const snapshot: CatalogSnapshot = {
        state: "ready-current",
        canMutate: true,
        checkedAt: "2026-08-19T00:05:00.000Z",
        catalog,
      };
      const host = createFakeHost({
        installResults: {
          [project.install!.repositoryUrl]: {
            internalName: "third-party/Alpha",
            folderName: "Alpha",
            enabled: true,
            type: "local",
            manifest: null,
          },
          "https://github.com/example/Beta.git": {
            internalName: "third-party/Beta",
            folderName: "Beta",
            enabled: true,
            type: "local",
            manifest: null,
          },
        },
      });
      const confirm = vi.fn(async () => true);
      const coordinator = createLifecycleCoordinator({
        host,
        store: new ProfileStore({ extensionSettings: {}, saveSettings: () => undefined }),
        getSnapshot: () => snapshot,
        confirm,
      });
      const prepared = await coordinator.prepareInstall("alpha");
      if (prepared.kind !== "single") throw new Error("Expected one prepared selection.");
      host.calls.length = 0;

      let installProjectId = "alpha";
      if (drift === "project ID") {
        const beta = catalogProjectFixture({ id: "beta", folderName: "Beta" });
        catalog.projects.push(beta);
        installProjectId = "beta";
      } else if (drift === "install contract") {
        project.install = { ...project.install!, branch: "next" };
      } else if (drift === "catalog generation") {
        catalog.generatedAt = "2026-08-19T01:00:00.000Z";
      } else {
        attachReport(project, "report-new", mismatchedSha);
      }

      await expect(coordinator.install(installProjectId, prepared.selection)).rejects.toMatchObject(
        {
          name: "InstallPreparationStaleError",
          reason: "This install choice is out of date. Choose a version again.",
        },
      );
      expect(host.calls).toEqual([]);
      expect(confirm).not.toHaveBeenCalled();
    },
  );

  it("rejects a prepared selection when the catalog changes while confirmation is open", async () => {
    const project = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
    attachReport(project, "report-123", checkedSha);
    const catalog = catalogFixture("2026-08-19T00:00:00.000Z");
    catalog.projects = [project];
    const snapshot: CatalogSnapshot = {
      state: "ready-current",
      canMutate: true,
      checkedAt: "2026-08-19T00:05:00.000Z",
      catalog,
    };
    const approval = deferred<boolean>();
    const confirm = vi
      .fn<(prompt: TrustPrompt) => Promise<boolean>>()
      .mockImplementationOnce(() => approval.promise)
      .mockResolvedValue(true);
    const host = createFakeHost();
    const store = new ProfileStore({
      extensionSettings: {},
      saveSettings: () => undefined,
    });
    const coordinator = createLifecycleCoordinator({
      host,
      store,
      getSnapshot: () => snapshot,
      confirm,
    });
    const selection = await prepareSingleSelection(coordinator);
    host.calls.length = 0;

    const installing = coordinator.install("alpha", selection);
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    catalog.generatedAt = "2026-08-19T01:00:00.000Z";
    approval.resolve(true);

    await expect(installing).rejects.toMatchObject({
      name: "InstallPreparationStaleError",
      reason: "This install choice is out of date. Choose a version again.",
    });
    expect(host.calls.filter(({ operation }) => operation === "install")).toEqual([]);
    expect(store.read().managedExtensions).toEqual({});
  });

  it("rejects a prepared selection when its expected folder appears while confirmation is open", async () => {
    const project = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
    attachReport(project, "report-123", checkedSha);
    const catalog = catalogFixture("2026-08-19T00:00:00.000Z");
    catalog.projects = [project];
    const snapshot: CatalogSnapshot = {
      state: "ready-current",
      canMutate: true,
      checkedAt: "2026-08-19T00:05:00.000Z",
      catalog,
    };
    const approval = deferred<boolean>();
    const confirm = vi
      .fn<(prompt: TrustPrompt) => Promise<boolean>>()
      .mockImplementationOnce(() => approval.promise)
      .mockResolvedValue(true);
    const host = createFakeHost();
    const concurrentExtension = {
      internalName: "third-party/Alpha",
      folderName: "Alpha",
      enabled: true,
      type: "local" as const,
      manifest: null,
    };
    vi.spyOn(host, "discover").mockResolvedValueOnce([]).mockResolvedValue([concurrentExtension]);
    const store = new ProfileStore({
      extensionSettings: {},
      saveSettings: () => undefined,
    });
    const coordinator = createLifecycleCoordinator({
      host,
      store,
      getSnapshot: () => snapshot,
      confirm,
    });
    const selection = await prepareSingleSelection(coordinator);
    host.calls.length = 0;

    const installing = coordinator.install("alpha", selection);
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    approval.resolve(true);

    await expect(installing).rejects.toMatchObject({
      name: "InstallPreparationStaleError",
      reason: "This install choice is out of date. Choose a version again.",
    });
    expect(host.calls.filter(({ operation }) => operation === "install")).toEqual([]);
    expect(host.calls.filter(({ operation }) => operation === "remove")).toEqual([]);
    await expect(host.discover()).resolves.toContainEqual(concurrentExtension);
    expect(store.read().managedExtensions).toEqual({});
  });

  it.each([
    {
      name: "the self-protected Companion project",
      project: catalogProjectFixture({ id: COMPANION_PROJECT_ID }),
      snapshot: (catalog: ReturnType<typeof catalogFixture>): CatalogSnapshot => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: "2026-08-19T00:00:00.000Z",
        catalog,
      }),
    },
    {
      name: "an incompatible catalog snapshot",
      project: catalogProjectFixture(),
      snapshot: (catalog: ReturnType<typeof catalogFixture>): CatalogSnapshot => ({
        state: "incompatible-with-cache",
        canMutate: false,
        checkedAt: "2026-08-19T00:00:00.000Z",
        remoteSchemaVersion: 8,
        catalog,
      }),
    },
    {
      name: "a non-extension project",
      project: catalogProjectFixture({ kind: "preset" }),
      snapshot: (catalog: ReturnType<typeof catalogFixture>): CatalogSnapshot => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: "2026-08-19T00:00:00.000Z",
        catalog,
      }),
    },
    {
      name: "a project without SillyTavern support",
      project: catalogProjectFixture({ frontend: "text-generation-webui" }),
      snapshot: (catalog: ReturnType<typeof catalogFixture>): CatalogSnapshot => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: "2026-08-19T00:00:00.000Z",
        catalog,
      }),
    },
    {
      name: "a malformed install contract",
      project: Object.assign(catalogProjectFixture(), {
        install: { kind: "sillytavern-extension-git", repositoryUrl: "not-a-url" },
      }),
      snapshot: (catalog: ReturnType<typeof catalogFixture>): CatalogSnapshot => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: "2026-08-19T00:00:00.000Z",
        catalog,
      }),
    },
    {
      name: "a project without an install contract",
      project: catalogProjectFixture({ folderName: null }),
      snapshot: (catalog: ReturnType<typeof catalogFixture>): CatalogSnapshot => ({
        state: "ready-current",
        canMutate: true,
        checkedAt: "2026-08-19T00:00:00.000Z",
        catalog,
      }),
    },
  ])(
    "rejects preparation for $name before any host revision call",
    async ({ project, snapshot }) => {
      const catalog = catalogFixture();
      catalog.projects = [project];
      const host = createFakeHost({
        capabilities: {
          pinnedCommitInstall: true,
          remoteRevisionLookup: true,
          localRevisionLookup: true,
        },
        remoteHeads: {
          [`${project.install?.repositoryUrl ?? "https://example.test/unused.git"}#`]: "c".repeat(
            40,
          ),
        },
      });
      const coordinator = createLifecycleCoordinator({
        host,
        store: new ProfileStore({ extensionSettings: {}, saveSettings: () => undefined }),
        getSnapshot: () => snapshot(catalog),
        confirm: async () => true,
      });

      await expect(coordinator.prepareInstall(project.id)).rejects.toThrow(
        "This project is not eligible for installation.",
      );
      expect(host.calls).toEqual([]);
    },
  );
});
