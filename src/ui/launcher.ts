import type { HostExtensionAdapter } from "../host/host-types";
import type { ProfileStore } from "../state/profile-store";
import { createPopupRuntime, renderCompanionPopup } from "./popup-host";

export interface CompanionLauncher {
  button: HTMLButtonElement;
  dispose(): void;
}

export function mountCompanionLauncher(input: {
  container: Element;
  host: HostExtensionAdapter;
  store?: ProfileStore;
}): CompanionLauncher {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "menu_button menu_button_icon tavernary-companion-launcher";
  button.dataset.tavernaryCompanionLauncher = "";
  button.textContent = "Tavernary Companion";
  input.container.append(button);

  let disposed = false;
  let popupContent: HTMLDivElement | null = null;
  let unmountPopup: (() => void) | null = null;
  const runtime = createPopupRuntime(input.store, input.host);

  const openPopup = () => {
    if (popupContent) {
      popupContent.focus();
      return;
    }

    const content = document.createElement("div");
    content.className = "tavernary-companion-root";
    content.dataset.tavernaryCompanionPopup = "";
    content.tabIndex = -1;
    popupContent = content;
    unmountPopup = renderCompanionPopup(content, { store: input.store, host: input.host, runtime });

    void input.host
      .showPopup(content, {
        id: "tavernary-companion",
        wide: true,
        large: true,
        allowVerticalScrolling: false,
      })
      .finally(() => {
        if (popupContent !== content) {
          return;
        }
        unmountPopup?.();
        unmountPopup = null;
        content.remove();
        popupContent = null;
        if (!disposed && button.isConnected) button.focus();
      });
  };
  button.addEventListener("click", openPopup);

  return {
    button,
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      button.removeEventListener("click", openPopup);
      unmountPopup?.();
      unmountPopup = null;
      popupContent?.remove();
      popupContent = null;
      button.remove();
    },
  };
}
