import { SillyTavernHostAdapter } from "./sillytavern-host";
import type { HostExtensionAdapter, HostPopupOptions } from "./host-types";

export interface SillyTavernExtensionModule {
  extensionNames: string[];
  extensionTypes: Record<string, string>;
  getExtensionManifest(name: string): Record<string, unknown> | null;
  installExtension(
    url: string,
    global: boolean,
    branch: string,
    commitSha?: string,
  ): Promise<boolean>;
  enableExtension(name: string, reload: boolean): Promise<void>;
  disableExtension(name: string, reload: boolean): Promise<void>;
}

interface NativePopup {
  dlg: HTMLDialogElement;
  closeButton: HTMLElement;
  show(): Promise<unknown>;
  complete(result: null): Promise<unknown> | unknown;
}

interface NativePopupConstructor {
  new (
    content: HTMLElement,
    type: number,
    inputValue: string,
    options: Record<string, unknown>,
  ): NativePopup;
}

export interface RuntimeSillyTavernContext {
  extensionSettings: Record<string, unknown>;
  saveSettingsDebounced(): void | Promise<void>;
  getRequestHeaders?(): Record<string, string>;
  Popup?: NativePopupConstructor;
  POPUP_TYPE?: { DISPLAY: number };
}

const EXTENSION_MODULE_PATH = "/scripts/extensions.js";

export async function createSillyTavernRuntimeHost(
  context: RuntimeSillyTavernContext,
  loadExtensionModule: () => Promise<SillyTavernExtensionModule> = async () =>
    (await import(/* @vite-ignore */ EXTENSION_MODULE_PATH)) as SillyTavernExtensionModule,
): Promise<HostExtensionAdapter> {
  const extensionModule = await loadExtensionModule();

  if (!context.getRequestHeaders || !context.Popup || !context.POPUP_TYPE) {
    throw new Error("SillyTavern context is missing required extension APIs.");
  }

  return new SillyTavernHostAdapter({
    getExtensionNames: () => extensionModule.extensionNames,
    getExtensionTypes: () => extensionModule.extensionTypes,
    getDisabledExtensions: () => {
      const disabled = context.extensionSettings.disabledExtensions;
      return Array.isArray(disabled)
        ? disabled.filter((value): value is string => typeof value === "string")
        : [];
    },
    getExtensionManifest: (name) => extensionModule.getExtensionManifest(name),
    installExtension: (url, global, branch, commitSha) =>
      extensionModule.installExtension(url, global, branch, commitSha),
    enableExtension: (name, reload) => extensionModule.enableExtension(name, reload),
    disableExtension: (name, reload) => extensionModule.disableExtension(name, reload),
    getRequestHeaders: () => context.getRequestHeaders!(),
    fetch: globalThis.fetch.bind(globalThis),
    reload: () => globalThis.location.reload(),
    openExtensionManager: async () => {
      const managerButton = document.querySelector<HTMLElement>("#extensions_details");
      if (!managerButton) {
        throw new Error("SillyTavern extension manager is unavailable.");
      }
      managerButton.click();
    },
    openExternal: (url) => openTrustedExternalUrl(url),
    showPopup: (content, options) => showNativePopup(context, content, options),
  });
}

function openTrustedExternalUrl(input: string): void {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("External links require an HTTP or HTTPS URL.");
  }
  globalThis.open(url.href, "_blank", "noopener,noreferrer");
}

export async function showNativePopup(
  context: RuntimeSillyTavernContext,
  content: HTMLElement,
  options: HostPopupOptions,
): Promise<void> {
  const Popup = context.Popup!;
  let removeBackdropDismissal: () => void = () => undefined;
  const popup = new Popup(content, context.POPUP_TYPE!.DISPLAY, "", {
    wide: options.wide ?? true,
    large: options.large ?? true,
    transparent: options.transparent ?? false,
    allowVerticalScrolling: options.allowVerticalScrolling ?? false,
    onOpen: (openedPopup: NativePopup) => {
      if (!options.dismissOnBackdrop) return;
      const onPointerDown = (event: PointerEvent) => {
        if (event.target === openedPopup.dlg) void openedPopup.complete(null);
      };
      openedPopup.dlg.addEventListener("pointerdown", onPointerDown);
      removeBackdropDismissal = () =>
        openedPopup.dlg.removeEventListener("pointerdown", onPointerDown);
    },
    onClose: () => removeBackdropDismissal(),
  });
  await popup.show();
}
