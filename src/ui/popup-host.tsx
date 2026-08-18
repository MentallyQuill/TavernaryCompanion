import { render } from "preact";
import type { ProfileStore } from "../state/profile-store";
import { CompanionShell } from "./shell/companion-shell";
import { createShellController } from "./shell/shell-controller";

interface CompanionPopupHostProps {
  store?: ProfileStore;
}

export function CompanionPopupHost({ store }: CompanionPopupHostProps): preact.JSX.Element {
  const controller = createShellController({
    initialRoute: store?.read().preferences.route ?? "projects",
    persistRoute: store
      ? async (route) => {
          await store.update((draft) => {
            draft.preferences.route = route;
          });
        }
      : undefined,
  });
  return <CompanionShell controller={controller} />;
}

export function renderCompanionPopup(
  container: HTMLElement,
  options: CompanionPopupHostProps = {},
): () => void {
  render(<CompanionPopupHost {...options} />, container);
  return () => render(null, container);
}
