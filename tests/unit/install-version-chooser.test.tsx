import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  PreparedInstallSelection,
  PreparedInstallTargetChoice,
} from "../../src/lifecycle/lifecycle-coordinator";
import {
  dispatchPreparedInstallChoice,
  InstallVersionChooser,
} from "../../src/ui/lifecycle/install-version-chooser";

afterEach(() => document.body.replaceChildren());

function selection(kind: "checked" | "newest"): PreparedInstallSelection {
  const requestedSha = kind === "checked" ? "a".repeat(40) : "b".repeat(40);
  return {
    target:
      kind === "checked"
        ? {
            kind,
            requestedSha,
            checkedAt: "2026-08-17T12:00:00.000Z",
            reportId: "report-alpha",
            reportUrl: "https://tavernary.org/scan/alpha",
          }
        : { kind, requestedSha, resolvedAt: "2026-08-19T12:00:00.000Z" },
    binding: {
      projectId: "alpha",
      catalogGeneratedAt: "2026-08-19T10:00:00.000Z",
      install: {
        kind: "sillytavern-extension-git",
        repositoryUrl: "https://example.com/alpha.git",
        branch: "main",
        manifestPath: "manifest.json",
        folderName: "alpha",
      },
      report: { reportId: "report-alpha", scannedSha: "a".repeat(40) },
      target: { kind, requestedSha },
    },
  };
}

function choice(
  disabledReason: string | null = null,
): Extract<PreparedInstallTargetChoice, { kind: "choose" }> {
  return {
    kind: "choose",
    checked: {
      selection: selection("checked") as PreparedInstallSelection<
        Extract<PreparedInstallSelection["target"], { kind: "checked" }>
      >,
      disabledReason,
    },
    newest: {
      selection: selection("newest") as PreparedInstallSelection<
        Extract<PreparedInstallSelection["target"], { kind: "newest" }>
      >,
    },
  };
}

function anchor(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "Install Alpha";
  button.getBoundingClientRect = () =>
    ({
      bottom: 144,
      height: 44,
      left: 220,
      right: 264,
      top: 100,
      width: 44,
      x: 220,
      y: 100,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.append(button);
  return button;
}

describe("InstallVersionChooser", () => {
  it("uses the approved plain-language choices and selects the exact target once", () => {
    const installButton = anchor();
    const onSelect = vi.fn();
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={installButton}
        choice={choice()}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Which version would you like?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Checked version" })).toHaveAccessibleDescription(
      "TavernKeeper checked this version on Aug 17.",
    );
    expect(screen.getByRole("button", { name: "Newest version" })).toHaveAccessibleDescription(
      "The latest version from the creator. It may include changes TavernKeeper hasn't checked yet.",
    );

    const checked = screen.getByRole("button", { name: "Checked version" });
    fireEvent.click(checked);
    fireEvent.click(checked);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(choice().checked.selection);
  });

  it("explains an older SillyTavern without changing the Newest choice", () => {
    const installButton = anchor();
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={installButton}
        choice={choice("Update SillyTavern to use the checked version.")}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const checked = screen.getByRole("button", { name: "Checked version" });
    expect(checked).toBeDisabled();
    expect(checked).toHaveAccessibleDescription(
      "TavernKeeper checked this version on Aug 17. Update SillyTavern to use the checked version.",
    );
    expect(screen.getByText("Update SillyTavern to use the checked version.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Newest version" })).toBeEnabled();
  });

  it("uses the approved sentence when the checked version disappeared", () => {
    const installButton = anchor();
    const unavailable =
      "That checked version isn't available anymore. You can choose the newest version or cancel.";
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={installButton}
        choice={choice(unavailable)}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(unavailable)).toBeVisible();
    expect(screen.getByRole("button", { name: "Checked version" })).toBeDisabled();
    expect(screen.getByRole("dialog")).not.toHaveTextContent(
      /safe|unsafe|secure|risky|verified|recommended/i,
    );
  });

  it("dismisses on Escape or outside press and restores focus to Install", () => {
    const installButton = anchor();
    const onCancel = vi.fn();
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={installButton}
        choice={choice()}
        onSelect={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(installButton).toHaveFocus();

    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("ports the chooser overlay into its owning open dialog without modal focus trapping", () => {
    const owner = document.createElement("dialog");
    owner.setAttribute("open", "");
    document.body.append(owner);
    const installButton = anchor();
    owner.append(installButton);
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={installButton}
        choice={choice()}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const chooser = screen.getByRole("dialog", { name: "Which version would you like?" });
    expect(chooser.parentElement).toHaveClass(
      "tavernary-companion-install-version-chooser-backdrop",
    );
    expect(chooser.parentElement?.parentElement).toBe(owner);
    expect(chooser).not.toHaveAttribute("aria-modal");
    expect(chooser).toHaveStyle({ position: "fixed" });
  });
});

describe("dispatchPreparedInstallChoice", () => {
  it("bypasses the chooser when preparation yields one target", () => {
    const onInstall = vi.fn();
    const onChoose = vi.fn();
    const single: PreparedInstallTargetChoice = {
      kind: "single",
      selection: selection("newest"),
    };

    dispatchPreparedInstallChoice(single, onInstall, onChoose);

    expect(onInstall).toHaveBeenCalledOnce();
    expect(onInstall).toHaveBeenCalledWith(single.selection);
    expect(onChoose).not.toHaveBeenCalled();
  });
});
