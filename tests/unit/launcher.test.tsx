import { fireEvent, waitFor } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";

import { mountCompanionLauncher } from "../../src/ui/launcher";
import { createFakeHost } from "../helpers/fake-host";

afterEach(() => {
  document.body.replaceChildren();
});

it("opens one native popup and focuses it when the launcher is clicked again", async () => {
  const menu = document.createElement("div");
  document.body.append(menu);
  const host = createFakeHost();
  let closePopup!: () => void;
  const popupClosed = new Promise<void>((resolve) => {
    closePopup = resolve;
  });
  const showPopup = vi.spyOn(host, "showPopup").mockImplementation(async (content) => {
    document.body.append(content);
    await popupClosed;
  });
  const launcher = mountCompanionLauncher({ container: menu, host });

  fireEvent.click(launcher.button);
  await waitFor(() => expect(showPopup).toHaveBeenCalledTimes(1));
  const content = showPopup.mock.calls[0][0];
  expect(content).toHaveAttribute("data-tavernary-companion-popup");
  expect(content).toHaveTextContent("Tavernary Companion");
  expect(showPopup.mock.calls[0][1]).toMatchObject({ wide: true, large: true });

  launcher.button.focus();
  fireEvent.click(launcher.button);
  expect(showPopup).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(content);

  closePopup();
  await waitFor(() => expect(content).not.toBeInTheDocument());
  launcher.dispose();
  expect(launcher.button).not.toBeInTheDocument();
});
