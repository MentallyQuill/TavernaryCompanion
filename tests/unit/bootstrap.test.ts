import { afterEach, expect, it, vi } from "vitest";

import {
  bootstrapCompanion,
  disposeCompanion,
  type CompanionContext,
} from "../../src/extension/bootstrap";
import { startCompanionLifecycle, stopCompanionLifecycle } from "../../src/extension/lifecycle";
import { createFakeHost } from "../helpers/fake-host";

afterEach(() => {
  disposeCompanion();
  document.body.replaceChildren();
});

it("mounts exactly one Tavernary Companion launcher", async () => {
  document.body.innerHTML = '<div><div id="extensions_details">Manage extensions</div></div>';
  const context: CompanionContext = {
    extensionSettings: {},
    saveSettingsDebounced: vi.fn(),
    host: createFakeHost(),
  };

  await Promise.all([bootstrapCompanion(context), bootstrapCompanion(context)]);

  expect(document.querySelectorAll("[data-tavernary-companion-launcher]")).toHaveLength(1);
  expect(document.querySelector("[data-tavernary-companion-launcher]")?.nextElementSibling).toBe(
    document.querySelector("#extensions_details"),
  );
});

it("reports missing context without throwing", async () => {
  document.body.innerHTML = '<div id="extensionsMenu"></div>';

  await expect(bootstrapCompanion(null)).resolves.toEqual({
    ok: false,
    reason: "missing-context",
  });
});

it("uses lifecycle start and stop without deleting profile state", async () => {
  document.body.innerHTML = '<div><div id="extensions_details">Manage extensions</div></div>';
  const extensionSettings = {
    tavernaryCompanion: { formatVersion: 1, personalKits: { retained: { title: "Retain me" } } },
  };
  const context: CompanionContext = {
    extensionSettings,
    saveSettingsDebounced: vi.fn(),
    host: createFakeHost(),
  };

  await startCompanionLifecycle(context);
  expect(document.querySelector("[data-tavernary-companion-launcher]")).toBeInTheDocument();

  stopCompanionLifecycle();
  expect(document.querySelector("[data-tavernary-companion-launcher]")).not.toBeInTheDocument();
  expect(extensionSettings.tavernaryCompanion.personalKits).toEqual({
    retained: { title: "Retain me" },
  });
});

it("constructs the host once when SillyTavern context does not inject one", async () => {
  document.body.innerHTML = '<div><div id="extensions_details">Manage extensions</div></div>';
  const hostFactory = vi.fn().mockResolvedValue(createFakeHost());
  const context: CompanionContext = {
    extensionSettings: {},
    saveSettingsDebounced: vi.fn(),
    hostFactory,
  };

  await bootstrapCompanion(context);
  await bootstrapCompanion(context);

  expect(hostFactory).toHaveBeenCalledTimes(1);
  expect(document.querySelector("[data-tavernary-companion-launcher]")).toBeInTheDocument();
});
