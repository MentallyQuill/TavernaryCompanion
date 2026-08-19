import { afterEach, describe, expect, it, vi } from "vitest";

import { showNativePopup, type RuntimeSillyTavernContext } from "../../src/host/runtime-host";

afterEach(() => document.body.replaceChildren());

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
      saveSettingsDebounced: vi.fn(),
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
