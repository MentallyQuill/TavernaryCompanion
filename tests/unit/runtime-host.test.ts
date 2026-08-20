import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSillyTavernRuntimeHost,
  resolveImmediateSettingsSave,
  showNativePopup,
  type RuntimeSillyTavernContext,
} from "../../src/host/runtime-host";

afterEach(() => document.body.replaceChildren());

it("forwards a checked commit through the runtime extension helper", async () => {
  const installExtension = vi.fn().mockResolvedValue(true);
  const extensionModule = {
    extensionNames: [],
    extensionTypes: {},
    getExtensionManifest: vi.fn(() => null),
    installExtension,
    enableExtension: vi.fn(),
    disableExtension: vi.fn(),
  };
  class Popup {
    dlg = document.createElement("dialog");
    closeButton = document.createElement("button");
    show = vi.fn(async () => undefined);
    complete = vi.fn(async () => undefined);
  }
  const context = {
    extensionSettings: {},
    saveSettings: vi.fn(),
    getRequestHeaders: () => ({}),
    Popup,
    POPUP_TYPE: { DISPLAY: 1 },
  } satisfies RuntimeSillyTavernContext;
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      pinnedCommitInstall: true,
      remoteRevisionLookup: true,
      localRevisionLookup: true,
    }),
  );
  const host = await createSillyTavernRuntimeHost(context, async () => extensionModule);
  const commitSha = "a".repeat(40);

  await host.install({
    repositoryUrl: "https://github.com/example/Alpha",
    branch: null,
    commitSha,
  });

  expect(installExtension).toHaveBeenCalledWith(
    "https://github.com/example/Alpha",
    false,
    "",
    commitSha,
  );
});

describe("resolveImmediateSettingsSave", () => {
  it("uses an injected immediate saver without loading the script module", async () => {
    const saveSettings = vi.fn(async () => undefined);
    const loadScriptModule = vi.fn();
    const context = {
      extensionSettings: {},
      saveSettings,
    } satisfies RuntimeSillyTavernContext;

    const save = await resolveImmediateSettingsSave(context, loadScriptModule);
    await save();

    expect(saveSettings).toHaveBeenCalledOnce();
    expect(loadScriptModule).not.toHaveBeenCalled();
  });

  it("loads and validates SillyTavern's immediate saver", async () => {
    const saveSettings = vi.fn(async () => undefined);
    const context = { extensionSettings: {} } satisfies RuntimeSillyTavernContext;

    const save = await resolveImmediateSettingsSave(context, async () => ({ saveSettings }));
    await save();

    expect(saveSettings).toHaveBeenCalledOnce();
  });

  it("fails closed when SillyTavern has no immediate saver", async () => {
    const context = { extensionSettings: {} } satisfies RuntimeSillyTavernContext;

    await expect(
      resolveImmediateSettingsSave(context, async () => ({ saveSettings: null })),
    ).rejects.toThrow("immediate settings save");
  });
});

describe("showNativePopup", () => {
  it("uses a transparent native popup and dismisses only from its backdrop", async () => {
    let resolveShow!: () => void;
    const showResult = new Promise<void>((resolve) => {
      resolveShow = resolve;
    });
    const complete = vi.fn(async () => undefined);
    let nativeOptions!: Record<string, unknown>;
    class Popup {
      static created: Popup | null = null;
      dlg = document.createElement("dialog");
      closeButton = document.createElement("button");
      show = () => showResult;
      complete = complete;
      constructor(
        _content: HTMLElement,
        _type: number,
        _input: string,
        options: Record<string, unknown>,
      ) {
        nativeOptions = options;
        Popup.created = this;
      }
    }
    const context = {
      extensionSettings: {},
      saveSettings: vi.fn(),
      Popup,
      POPUP_TYPE: { DISPLAY: 4 },
    } satisfies RuntimeSillyTavernContext;

    const showing = showNativePopup(context, document.createElement("div"), {
      transparent: true,
      dismissOnBackdrop: true,
    });
    const instance = Popup.created!;

    expect(nativeOptions).toMatchObject({
      transparent: true,
      allowVerticalScrolling: false,
    });
    const onOpen = nativeOptions.onOpen as (popup: typeof instance) => void;
    const onClose = nativeOptions.onClose as (popup: typeof instance) => void;
    onOpen(instance);

    const inside = document.createElement("div");
    instance.dlg.append(inside);
    inside.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(complete).not.toHaveBeenCalled();

    instance.dlg.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith(null);

    onClose(instance);
    instance.dlg.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(complete).toHaveBeenCalledOnce();

    resolveShow();
    await showing;
  });
});
