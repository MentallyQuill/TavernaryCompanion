import { expect, it, vi } from "vitest";

import { HostOperationError } from "../../src/host/host-errors";
import { SillyTavernHostAdapter } from "../../src/host/sillytavern-host";
import { createFakeHost } from "../helpers/fake-host";

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
