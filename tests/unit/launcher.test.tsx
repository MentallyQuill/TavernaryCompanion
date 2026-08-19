import { fireEvent, waitFor } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";

import { mountCompanionLauncher } from "../../src/ui/launcher";
import { createFakeHost } from "../helpers/fake-host";

afterEach(() => {
  document.body.replaceChildren();
});

it("mounts a branded launcher immediately before native extension management", () => {
  document.body.innerHTML = `
    <div id="extensions-toolbar">
      <div id="extensions_details">Manage extensions</div>
    </div>
  `;
  const manageExtensions = document.querySelector("#extensions_details");
  if (!manageExtensions) throw new Error("Missing test fixture anchor.");

  const launcher = mountCompanionLauncher({
    anchor: manageExtensions,
    host: createFakeHost(),
  });

  expect(launcher.button).toHaveTextContent("Tavernary Companion");
  expect(launcher.button.nextElementSibling).toBe(manageExtensions);
  expect(launcher.button.querySelector("span[data-tavernary-companion-label]")).toHaveTextContent(
    "Tavernary Companion",
  );
  expect(launcher.button.querySelector("[data-tavernary-companion-icon]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});

it("uses the bundled Tavernary trihex for the launcher icon", () => {
  const manageExtensions = document.createElement("div");
  document.body.append(manageExtensions);

  const launcher = mountCompanionLauncher({
    anchor: manageExtensions,
    host: createFakeHost(),
  });
  const icon = launcher.button.querySelector("img[data-tavernary-companion-icon]");

  expect(icon).toHaveAttribute("src", expect.stringMatching(/assets\/tavernary-trihex\.png$/));
  expect(icon).toHaveAttribute("alt", "");
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
  const launcher = mountCompanionLauncher({ anchor: menu, host });

  fireEvent.click(launcher.button);
  await waitFor(() => expect(showPopup).toHaveBeenCalledTimes(1));
  const content = showPopup.mock.calls[0][0];
  expect(content).toHaveAttribute("data-tavernary-companion-popup");
  expect(content).toHaveTextContent("Tavernary");
  expect(content).not.toHaveTextContent("Where AI roleplay tools gather");
  expect(showPopup.mock.calls[0][1]).toMatchObject({
    wide: true,
    large: true,
    transparent: true,
    dismissOnBackdrop: true,
  });

  launcher.button.focus();
  fireEvent.click(launcher.button);
  expect(showPopup).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(content);

  closePopup();
  await waitFor(() => expect(content).not.toBeInTheDocument());
  launcher.dispose();
  expect(launcher.button).not.toBeInTheDocument();
});
