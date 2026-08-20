import { expect, it, vi } from "vitest";

import { HostOperationError } from "../../src/host/host-errors";
import { SillyTavernHostAdapter } from "../../src/host/sillytavern-host";
import { createFakeHost } from "../helpers/fake-host";

const repositoryUrl = "https://github.com/example/Alpha";
const installedSha = "0".repeat(40);
const checkedSha = "a".repeat(40);
const remoteSha = "b".repeat(40);

function createSillyTavernHost(overrides: Record<string, unknown> = {}) {
  return new SillyTavernHostAdapter({
    getExtensionNames: () => [],
    getExtensionTypes: () => ({}),
    getDisabledExtensions: () => [],
    getExtensionManifest: () => null,
    installExtension: vi.fn(),
    enableExtension: vi.fn(),
    disableExtension: vi.fn(),
    getRequestHeaders: () => ({ Authorization: "private" }),
    fetch: vi.fn(),
    reload: vi.fn(),
    openExtensionManager: vi.fn(),
    openExternal: vi.fn(),
    showPopup: vi.fn(),
    ...overrides,
  });
}

function validUpdateInspectionResponse() {
  return Response.json({
    installedSha,
    newestSha: remoteSha,
    remoteUrl: repositoryUrl,
    branch: "main",
    worktreeClean: true,
    branchMatches: true,
    exactUpdateSupported: true,
    newestRelationship: "behind",
    candidateRelationships: { [checkedSha]: "behind" },
  });
}

it("falls back to legacy install capabilities when the capability endpoint is absent", async () => {
  const host = createSillyTavernHost({
    fetch: vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
  });

  await expect(host.getInstallCapabilities()).resolves.toEqual({
    pinnedCommitInstall: false,
    remoteRevisionLookup: false,
    localRevisionLookup: true,
  });
});

it("shares one legacy capability probe across concurrent and later callers", async () => {
  let finishProbe!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finishProbe = resolve;
  });
  const fetchMock = vi.fn(() => pending);
  const host = createSillyTavernHost({ fetch: fetchMock });

  const probes = [
    host.getInstallCapabilities(),
    host.getInstallCapabilities(),
    host.getInstallCapabilities(),
  ];
  expect(fetchMock).toHaveBeenCalledOnce();
  finishProbe(new Response("missing", { status: 404 }));

  await expect(Promise.all(probes)).resolves.toEqual([
    { pinnedCommitInstall: false, remoteRevisionLookup: false, localRevisionLookup: true },
    { pinnedCommitInstall: false, remoteRevisionLookup: false, localRevisionLookup: true },
    { pinnedCommitInstall: false, remoteRevisionLookup: false, localRevisionLookup: true },
  ]);
  await host.getInstallCapabilities();
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("retries capability discovery after a transient host failure", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("busy", { status: 503 }))
    .mockResolvedValueOnce(
      Response.json({
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      }),
    );
  const host = createSillyTavernHost({ fetch: fetchMock });

  await expect(host.getInstallCapabilities()).rejects.toMatchObject({ status: 503 });
  await expect(host.getInstallCapabilities()).resolves.toMatchObject({
    pinnedCommitInstall: true,
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("reads advertised install capabilities", async () => {
  const host = createSillyTavernHost({
    fetch: vi.fn().mockResolvedValue(
      Response.json({
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      }),
    ),
  });

  await expect(host.getInstallCapabilities()).resolves.toEqual({
    pinnedCommitInstall: true,
    remoteRevisionLookup: true,
    localRevisionLookup: true,
  });
});

it("resolves and validates the remote branch revision", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ sha: remoteSha }));
  const host = createSillyTavernHost({ fetch: fetchMock });

  await expect(host.resolveRemoteRevision({ repositoryUrl, branch: null })).resolves.toEqual({
    sha: remoteSha,
  });
  expect(fetchMock).toHaveBeenCalledWith("/api/extensions/resolve", {
    method: "POST",
    headers: { Authorization: "private" },
    body: JSON.stringify({ repositoryUrl, branch: null }),
  });
});

it("rejects malformed remote revision hashes", async () => {
  const host = createSillyTavernHost({
    fetch: vi.fn().mockResolvedValue(Response.json({ sha: "not-a-commit" })),
  });

  await expect(host.resolveRemoteRevision({ repositoryUrl, branch: null })).rejects.toThrow(
    "valid commit",
  );
});

it("classifies malformed remote repository URLs as revision lookup failures", async () => {
  const host = createSillyTavernHost();

  const error = await host
    .resolveRemoteRevision({ repositoryUrl: "not a repository URL", branch: null })
    .catch((cause: unknown) => cause);

  expect(error).toBeInstanceOf(HostOperationError);
  expect(error).toMatchObject({ operation: "resolveRevision" });
});

it("sanitizes bounded details from failed revision lookups", async () => {
  const host = createSillyTavernHost({
    fetch: vi.fn().mockResolvedValue(new Response(`\u0000${"x".repeat(600)}`, { status: 502 })),
  });

  const error = await host
    .resolveRemoteRevision({ repositoryUrl, branch: null })
    .catch((cause: unknown) => cause);

  expect(error).toBeInstanceOf(HostOperationError);
  expect(error).toMatchObject({ status: 502, details: "x".repeat(500) });
});

it("reads a local revision and treats an empty host hash as absent", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ currentCommitHash: checkedSha }))
    .mockResolvedValueOnce(Response.json({ currentCommitHash: "" }));
  const host = createSillyTavernHost({ fetch: fetchMock });

  await expect(
    host.readLocalRevision({ internalName: "third-party/Alpha", type: "local" }),
  ).resolves.toBe(checkedSha);
  await expect(
    host.readLocalRevision({ internalName: "third-party/Alpha", type: "local" }),
  ).resolves.toBeNull();
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/extensions/version", {
    method: "POST",
    headers: { Authorization: "private" },
    body: JSON.stringify({ extensionName: "Alpha", global: false }),
  });
});

it("rejects malformed non-empty local revision hashes", async () => {
  const host = createSillyTavernHost({
    fetch: vi.fn().mockResolvedValue(Response.json({ currentCommitHash: "short" })),
  });

  await expect(
    host.readLocalRevision({ internalName: "third-party/Alpha", type: "global" }),
  ).rejects.toThrow("valid commit");
});

it("reads strict update inspection evidence from the non-legacy status endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      installedSha,
      newestSha: remoteSha,
      remoteUrl: repositoryUrl,
      branch: "main",
      worktreeClean: true,
      branchMatches: true,
      exactUpdateSupported: true,
      newestRelationship: "behind",
      candidateRelationships: { [checkedSha]: "behind" },
    }),
  );
  const host = createSillyTavernHost({ fetch: fetchMock });

  await expect(
    host.inspectUpdate({
      internalName: "third-party/Alpha",
      type: "local",
      repositoryUrl,
      branch: null,
      candidateShas: [checkedSha],
    }),
  ).resolves.toEqual({
    installedSha,
    newestSha: remoteSha,
    remoteUrl: repositoryUrl,
    branch: "main",
    worktreeClean: true,
    branchMatches: true,
    exactUpdateSupported: true,
    newestRelationship: "behind",
    candidateRelationships: { [checkedSha]: "behind" },
  });
  expect(fetchMock).toHaveBeenCalledWith("/api/extensions/update-status", {
    method: "POST",
    headers: { Authorization: "private" },
    body: JSON.stringify({
      extensionName: "Alpha",
      global: false,
      repositoryUrl,
      branch: null,
      candidateShas: [checkedSha],
    }),
  });
});

it("explains when safe update inspection is unavailable on an older host", async () => {
  const host = createSillyTavernHost({
    fetch: vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
  });

  await expect(
    host.inspectUpdate({
      internalName: "third-party/Alpha",
      type: "local",
      repositoryUrl,
      branch: null,
      candidateShas: [],
    }),
  ).rejects.toThrow("This version of SillyTavern cannot check updates safely.");
});

it("shares one unsupported update probe across concurrent and later checks", async () => {
  let finishProbe!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finishProbe = resolve;
  });
  const fetchMock = vi.fn(() => pending);
  const host = createSillyTavernHost({ fetch: fetchMock });
  const inspect = (internalName: string) =>
    host.inspectUpdate({
      internalName,
      type: "local",
      repositoryUrl,
      branch: null,
      candidateShas: [],
    });

  const probes = [inspect("third-party/Alpha"), inspect("third-party/Beta"), inspect("Gamma")];
  expect(fetchMock).toHaveBeenCalledOnce();
  finishProbe(new Response("missing", { status: 404 }));

  const results = await Promise.allSettled(probes);
  expect(results.every(({ status }) => status === "rejected")).toBe(true);
  await expect(inspect("third-party/Delta")).rejects.toThrow(
    "This version of SillyTavern cannot check updates safely.",
  );
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("retries update support discovery after a transient response", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("busy", { status: 503 }))
    .mockResolvedValueOnce(validUpdateInspectionResponse());
  const host = createSillyTavernHost({ fetch: fetchMock });
  const input = {
    internalName: "third-party/Alpha",
    type: "local" as const,
    repositoryUrl,
    branch: null,
    candidateShas: [checkedSha],
  };

  await expect(host.inspectUpdate(input)).rejects.toMatchObject({ status: 503 });
  await expect(host.inspectUpdate(input)).resolves.toMatchObject({
    installedSha,
    newestSha: remoteSha,
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("rejects non-boolean update safety evidence", async () => {
  const host = createSillyTavernHost({
    fetch: vi.fn().mockResolvedValue(
      Response.json({
        installedSha,
        newestSha: remoteSha,
        remoteUrl: repositoryUrl,
        branch: "main",
        worktreeClean: "yes",
        branchMatches: true,
        exactUpdateSupported: true,
        newestRelationship: "behind",
        candidateRelationships: {},
      }),
    ),
  });

  await expect(
    host.inspectUpdate({
      internalName: "third-party/Alpha",
      type: "local",
      repositoryUrl,
      branch: null,
      candidateShas: [],
    }),
  ).rejects.toThrow("invalid extension update evidence");
});

it("sends immutable update targets only to the exact update endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  const host = createSillyTavernHost({ fetch: fetchMock });

  await host.applyUpdate({
    internalName: "third-party/Alpha",
    type: "local",
    repositoryUrl,
    branch: null,
    expectedCurrentSha: installedSha,
    targetSha: remoteSha,
  });

  expect(fetchMock).toHaveBeenCalledWith("/api/extensions/update-to", {
    method: "POST",
    headers: { Authorization: "private" },
    body: JSON.stringify({
      extensionName: "Alpha",
      global: false,
      repositoryUrl,
      branch: null,
      expectedCurrentSha: installedSha,
      targetSha: remoteSha,
    }),
  });
});

it("forwards a checked commit only when pinned installs are advertised", async () => {
  const installExtension = vi.fn().mockResolvedValue(true);
  const host = createSillyTavernHost({
    installExtension,
    fetch: vi.fn().mockResolvedValue(
      Response.json({
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      }),
    ),
  });

  await host.install({ repositoryUrl, branch: null, commitSha: checkedSha });

  expect(installExtension).toHaveBeenCalledWith(repositoryUrl, false, "", checkedSha);
});

it("refuses a checked commit when pinned installs are unavailable", async () => {
  const installExtension = vi.fn();
  const host = createSillyTavernHost({
    installExtension,
    fetch: vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
  });

  await expect(
    host.install({ repositoryUrl, branch: null, commitSha: checkedSha }),
  ).rejects.toThrow("pinned");
  expect(installExtension).not.toHaveBeenCalled();
});

it.each(["", "   "])("rejects a supplied invalid install commit SHA %j", async (commitSha) => {
  const installExtension = vi.fn().mockResolvedValue(true);
  const host = createSillyTavernHost({ installExtension });

  await expect(host.install({ repositoryUrl, branch: null, commitSha })).rejects.toThrow(
    "valid commit",
  );
  expect(installExtension).not.toHaveBeenCalled();
});

it("maps only an explicit unavailable-commit failure to the typed host error", async () => {
  const unavailable = Object.assign(new Error("commit missing"), { code: "COMMIT_UNAVAILABLE" });
  const networkFailure = new TypeError("network failed");
  const capabilities = Response.json({
    pinnedCommitInstall: true,
    remoteRevisionLookup: true,
    localRevisionLookup: true,
  });
  const explicitlyUnavailableHost = createSillyTavernHost({
    installExtension: vi.fn().mockRejectedValue(unavailable),
    fetch: vi.fn().mockResolvedValue(capabilities),
  });
  const networkFailureHost = createSillyTavernHost({
    installExtension: vi.fn().mockRejectedValue(networkFailure),
    fetch: vi.fn().mockResolvedValue(
      Response.json({
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      }),
    ),
  });

  const unavailableError = await explicitlyUnavailableHost
    .install({ repositoryUrl, branch: null, commitSha: checkedSha })
    .catch((cause: unknown) => cause);
  expect(unavailableError).toMatchObject({ name: "HostRevisionUnavailableError" });
  await expect(
    networkFailureHost.install({ repositoryUrl, branch: null, commitSha: checkedSha }),
  ).rejects.toBe(networkFailure);
});

it("models remote, installed, unavailable, and mismatched revisions in the fake host", async () => {
  const unavailableSha = "c".repeat(40);
  const host = createFakeHost({
    capabilities: {
      pinnedCommitInstall: true,
      remoteRevisionLookup: true,
      localRevisionLookup: true,
    },
    remoteHeads: { [`${repositoryUrl}#`]: remoteSha },
    installedRevisions: { "local:third-party/Alpha": checkedSha },
    unavailableHashes: [unavailableSha],
    mismatchResults: { [checkedSha]: remoteSha },
    installResults: {
      [repositoryUrl]: {
        internalName: "third-party/Alpha",
        folderName: "Alpha",
        enabled: true,
        type: "local",
        manifest: { key: "alpha" },
      },
    },
  });

  await expect(host.getInstallCapabilities()).resolves.toEqual({
    pinnedCommitInstall: true,
    remoteRevisionLookup: true,
    localRevisionLookup: true,
  });
  await expect(host.resolveRemoteRevision({ repositoryUrl, branch: null })).resolves.toEqual({
    sha: remoteSha,
  });
  await expect(
    host.readLocalRevision({ internalName: "third-party/Alpha", type: "local" }),
  ).resolves.toBe(checkedSha);
  await host.install({ repositoryUrl, branch: null, commitSha: checkedSha });
  await expect(
    host.readLocalRevision({ internalName: "third-party/Alpha", type: "local" }),
  ).resolves.toBe(remoteSha);
  await expect(
    host.install({ repositoryUrl, branch: null, commitSha: unavailableSha }),
  ).rejects.toMatchObject({ name: "HostRevisionUnavailableError" });
});

it("models update inspection and exact revision changes in the fake host", async () => {
  const inspection = {
    installedSha,
    newestSha: remoteSha,
    remoteUrl: repositoryUrl,
    branch: "main",
    worktreeClean: true,
    branchMatches: true,
    exactUpdateSupported: true,
    newestRelationship: "behind" as const,
    candidateRelationships: { [checkedSha]: "behind" as const },
  };
  const host = createFakeHost({
    extensions: [
      {
        internalName: "third-party/Alpha",
        folderName: "Alpha",
        enabled: true,
        type: "local",
        manifest: null,
      },
    ],
    installedRevisions: { "local:third-party/Alpha": installedSha },
    updateInspections: { "local:third-party/Alpha": inspection },
  });

  await expect(
    host.inspectUpdate({
      internalName: "third-party/Alpha",
      type: "local",
      repositoryUrl,
      branch: null,
      candidateShas: [checkedSha],
    }),
  ).resolves.toEqual(inspection);
  await host.applyUpdate({
    internalName: "third-party/Alpha",
    type: "local",
    repositoryUrl,
    branch: null,
    expectedCurrentSha: installedSha,
    targetSha: remoteSha,
  });
  await expect(
    host.readLocalRevision({ internalName: "third-party/Alpha", type: "local" }),
  ).resolves.toBe(remoteSha);
});

it("discovers canonical host identities and enabled state", async () => {
  const host = createFakeHost({
    extensions: [
      {
        internalName: "third-party/Alpha",
        folderName: "Alpha",
        enabled: false,
        type: "local",
        manifest: { key: "alpha", display_name: "Alpha", version: "1.0.0" },
      },
    ],
  });

  await expect(host.discover()).resolves.toEqual([
    expect.objectContaining({
      internalName: "third-party/Alpha",
      folderName: "Alpha",
      enabled: false,
    }),
  ]);
});

it("records enable calls and mutates authoritative state without reloading", async () => {
  const host = createFakeHost({
    extensions: [
      {
        internalName: "third-party/Alpha",
        folderName: "Alpha",
        enabled: false,
        type: "local",
        manifest: null,
      },
    ],
  });

  await host.enable("third-party/Alpha");

  expect(host.calls).toEqual([{ operation: "enable", internalName: "third-party/Alpha" }]);
  await expect(host.discover()).resolves.toEqual([
    expect.objectContaining({ internalName: "third-party/Alpha", enabled: true }),
  ]);
  expect(host.reloadCount).toBe(0);
});

it("does not mutate fake host state when an operation fails", async () => {
  const failure = new Error("host refused disable");
  const host = createFakeHost({
    extensions: [
      {
        internalName: "third-party/Alpha",
        folderName: "Alpha",
        enabled: true,
        type: "local",
        manifest: null,
      },
    ],
    failures: { disable: failure },
  });

  await expect(host.disable("third-party/Alpha")).rejects.toBe(failure);
  await expect(host.discover()).resolves.toEqual([
    expect.objectContaining({ internalName: "third-party/Alpha", enabled: true }),
  ]);
});

it("models install, remove, and explicit reload in call order", async () => {
  const repositoryUrl = "https://github.com/example/Beta";
  const host = createFakeHost({
    installResults: {
      [repositoryUrl]: {
        internalName: "third-party/Beta",
        folderName: "Beta",
        enabled: true,
        type: "local",
        manifest: { key: "beta" },
      },
    },
  });

  await host.install({ repositoryUrl, branch: null });
  await host.remove({ internalName: "third-party/Beta", type: "local" });
  host.reload();

  await expect(host.discover()).resolves.toEqual([]);
  expect(host.calls).toEqual([
    { operation: "install", repositoryUrl, branch: null },
    { operation: "remove", internalName: "third-party/Beta", type: "local" },
    { operation: "reload" },
    { operation: "discover" },
  ]);
  expect(host.reloadCount).toBe(1);
});

it("rejects a non-HTTP install URL before calling SillyTavern", async () => {
  const installExtension = vi.fn();
  const host = new SillyTavernHostAdapter({
    getExtensionNames: () => [],
    getExtensionTypes: () => ({}),
    getDisabledExtensions: () => [],
    getExtensionManifest: () => null,
    installExtension,
    enableExtension: vi.fn(),
    disableExtension: vi.fn(),
    getRequestHeaders: () => ({ Authorization: "private" }),
    fetch: vi.fn(),
    reload: vi.fn(),
    openExtensionManager: vi.fn(),
    openExternal: vi.fn(),
    showPopup: vi.fn(),
  });

  await expect(host.install({ repositoryUrl: "file:///tmp/unsafe", branch: null })).rejects.toThrow(
    "HTTP or HTTPS",
  );
  expect(installExtension).not.toHaveBeenCalled();
});

it("checks remove responses and exposes only bounded printable error details", async () => {
  const privateHeader = "Bearer do-not-leak";
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    statusText: "Server Error",
    text: async () => `\u0000${"x".repeat(600)}`,
  });
  const host = new SillyTavernHostAdapter({
    getExtensionNames: () => [],
    getExtensionTypes: () => ({}),
    getDisabledExtensions: () => [],
    getExtensionManifest: () => null,
    installExtension: vi.fn(),
    enableExtension: vi.fn(),
    disableExtension: vi.fn(),
    getRequestHeaders: () => ({ Authorization: privateHeader }),
    fetch: fetchMock,
    reload: vi.fn(),
    openExtensionManager: vi.fn(),
    openExternal: vi.fn(),
    showPopup: vi.fn(),
  });

  const operation = host.remove({ internalName: "third-party/Alpha", type: "local" });
  const error = await operation.catch((cause: unknown) => cause);

  expect(error).toBeInstanceOf(HostOperationError);
  if (!(error instanceof HostOperationError)) {
    throw error;
  }
  expect(error).toMatchObject({ operation: "remove", status: 500 });
  expect(error.details).toHaveLength(500);
  expect(error.details).toMatch(/^x+$/);
  expect(`${error.message} ${error.details}`).not.toContain(privateHeader);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/extensions/delete",
    expect.objectContaining({
      method: "POST",
      headers: { Authorization: privateHeader },
      body: JSON.stringify({ extensionName: "Alpha", global: false }),
    }),
  );
});

it("stops reporting a removed extension when SillyTavern's module inventory is stale", async () => {
  const host = createSillyTavernHost({
    getExtensionNames: () => ["third-party/Alpha"],
    getExtensionTypes: () => ({ "third-party/Alpha": "local" }),
    getExtensionManifest: () => ({ key: "alpha", display_name: "Alpha" }),
    fetch: vi.fn().mockResolvedValue(new Response("removed")),
  });

  await host.remove({ internalName: "third-party/Alpha", type: "local" });

  await expect(host.discover()).resolves.toEqual([]);
});

it("reports an extension again after SillyTavern successfully reinstalls it", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("removed"))
    .mockResolvedValueOnce(Response.json([{ name: "third-party/Alpha", type: "local" }]));
  const host = createSillyTavernHost({
    getExtensionNames: () => ["third-party/Alpha"],
    getExtensionTypes: () => ({ "third-party/Alpha": "local" }),
    getExtensionManifest: () => ({ key: "alpha", display_name: "Alpha" }),
    installExtension: vi.fn().mockResolvedValue(true),
    fetch: fetchMock,
  });

  await host.remove({ internalName: "third-party/Alpha", type: "local" });
  await host.install({ repositoryUrl, branch: null });

  await expect(host.discover()).resolves.toEqual([
    expect.objectContaining({ internalName: "third-party/Alpha", type: "local" }),
  ]);
});

it("uses SillyTavern's refreshed module inventory when reinstall discovery is unavailable", async () => {
  const host = createSillyTavernHost({
    getExtensionNames: () => ["third-party/Alpha"],
    getExtensionTypes: () => ({ "third-party/Alpha": "local" }),
    getExtensionManifest: () => ({ key: "alpha", display_name: "Alpha" }),
    installExtension: vi.fn().mockResolvedValue(true),
    fetch: vi
      .fn()
      .mockResolvedValueOnce(new Response("removed"))
      .mockRejectedValueOnce(new Error("discover unavailable")),
  });

  await host.remove({ internalName: "third-party/Alpha", type: "local" });
  await host.install({ repositoryUrl, branch: null });

  await expect(host.discover()).resolves.toEqual([
    expect.objectContaining({ internalName: "third-party/Alpha", type: "local" }),
  ]);
});

it("keeps a removed identity hidden after installing a different extension", async () => {
  const host = createSillyTavernHost({
    getExtensionNames: () => ["third-party/Alpha"],
    getExtensionTypes: () => ({ "third-party/Alpha": "local" }),
    getExtensionManifest: () => ({ key: "alpha", display_name: "Alpha" }),
    installExtension: vi.fn().mockResolvedValue(true),
    fetch: vi
      .fn()
      .mockResolvedValueOnce(new Response("removed"))
      .mockResolvedValueOnce(Response.json([{ name: "third-party/Beta", type: "local" }])),
  });

  await host.remove({ internalName: "third-party/Alpha", type: "local" });
  await host.install({ repositoryUrl: "https://github.com/example/Beta", branch: null });

  await expect(host.discover()).resolves.toEqual([]);
});

it("records native presentation calls in order", async () => {
  const host = createFakeHost();
  const content = document.createElement("section");

  await host.openExtensionManager();
  host.openExternal("https://tavernary.org/projects/alpha");
  await host.showPopup(content, { id: "tavernary-companion", wide: true, large: true });

  expect(host.calls).toEqual([
    { operation: "openExtensionManager" },
    { operation: "openExternal", url: "https://tavernary.org/projects/alpha" },
    {
      operation: "showPopup",
      content,
      options: { id: "tavernary-companion", wide: true, large: true },
    },
  ]);
});

it("discovers fresh SillyTavern extension records without exposing manifest references", async () => {
  const manifest = { key: "alpha", display_name: "Alpha" };
  const host = new SillyTavernHostAdapter({
    getExtensionNames: () => ["built-in", "third-party/Alpha"],
    getExtensionTypes: () => ({ "built-in": "system", "third-party/Alpha": "global" }),
    getDisabledExtensions: () => ["third-party/Alpha"],
    getExtensionManifest: () => manifest,
    installExtension: vi.fn(),
    enableExtension: vi.fn(),
    disableExtension: vi.fn(),
    getRequestHeaders: () => ({}),
    fetch: vi.fn(),
    reload: vi.fn(),
    openExtensionManager: vi.fn(),
    openExternal: vi.fn(),
    showPopup: vi.fn(),
  });

  const first = await host.discover();
  first[0].manifest!.key = "mutated";

  await expect(host.discover()).resolves.toEqual([
    {
      internalName: "third-party/Alpha",
      folderName: "Alpha",
      enabled: false,
      type: "global",
      manifest: { key: "alpha", display_name: "Alpha" },
    },
  ]);
  expect(manifest.key).toBe("alpha");
});
