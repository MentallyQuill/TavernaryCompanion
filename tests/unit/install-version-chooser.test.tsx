import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TavernKeeperCardStatus } from "../../src/catalog/catalog-core";
import type {
  PreparedInstallSelection,
  PreparedInstallTargetChoice,
} from "../../src/lifecycle/lifecycle-coordinator";
import {
  dispatchPreparedInstallChoice,
  InstallVersionChooser,
} from "../../src/ui/lifecycle/install-version-chooser";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

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

function scanStatus(): TavernKeeperCardStatus {
  return {
    state: "teal",
    riskLevel: "low",
    freshness: "stale",
    currentSha: "b".repeat(40),
    report: {
      reportId: "report-alpha",
      riskLevel: "low",
      headline: "Low concern",
      summary: "No material security concerns were identified in the reviewed source.",
      minorCautions: 0,
      materialConcerns: 0,
      highDanger: 0,
      maliciousEvidence: "",
      citedFindingIds: [],
      scannedSha: "a".repeat(40),
      treeUrl: `https://github.com/example/alpha/tree/${"a".repeat(40)}`,
      scannedAt: "2026-08-17T00:00:00.000Z",
      assessedAt: "2026-08-18T00:00:00.000Z",
      scannerPolicyVersion: "5",
      contextualReviewPolicyVersion: "1",
      synthesisPolicyVersion: "1",
      synthesisModel: "review-model",
      dangerBasis: "none",
      assessmentSource: "model",
      reportUrl: "https://tavernary.org/security/tavernkeeper/reports/report-alpha/",
      technicalHistoryUrl: null,
    },
    history: [],
    historyUrl: null,
  };
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
        scanStatus={scanStatus()}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Choose a version for Alpha" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Latest scanned" })).toHaveAccessibleDescription(
      "Scanned Aug 17 · older than latest.",
    );
    expect(screen.getByRole("button", { name: "Latest from creator" })).toHaveAccessibleDescription(
      "Newer changes have not been scanned yet.",
    );
    const scan = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern; stale assessment.",
    });
    fireEvent.pointerEnter(scan, { pointerType: "mouse" });
    expect(screen.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();

    const checked = screen.getByRole("button", { name: "Latest scanned" });
    fireEvent.click(checked);
    fireEvent.click(checked);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(choice().checked.selection);
    expect(installButton).toHaveFocus();
  });

  it("does not show scan evidence from a different prepared revision", () => {
    const mismatched = scanStatus();
    mismatched.report = {
      ...mismatched.report!,
      reportId: "report-newer",
      scannedSha: "c".repeat(40),
    };
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={anchor()}
        choice={choice()}
        scanStatus={mismatched}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /TavernKeeper scan:/u })).not.toBeInTheDocument();
  });

  it("explains an older SillyTavern without changing the Newest choice", () => {
    const installButton = anchor();
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={installButton}
        choice={choice("Update SillyTavern to use the latest scanned version.")}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const checked = screen.getByRole("button", { name: "Latest scanned" });
    expect(checked).toBeDisabled();
    expect(checked).toHaveAccessibleDescription(
      "Scanned Aug 17 · older than latest. Update SillyTavern to use the latest scanned version.",
    );
    expect(screen.getByText("Update SillyTavern to use the latest scanned version.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Latest from creator" })).toBeEnabled();
  });

  it("uses the approved sentence when the checked version disappeared", () => {
    const installButton = anchor();
    const unavailable =
      "That scanned version isn't available anymore. You can choose Latest from creator or cancel.";
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
    expect(screen.getByRole("button", { name: "Latest scanned" })).toBeDisabled();
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

    const chooser = screen.getByRole("dialog", { name: "Choose a version for Alpha" });
    expect(chooser.parentElement).toHaveClass(
      "tavernary-companion-install-version-chooser-backdrop",
    );
    expect(chooser.parentElement?.parentElement).toBe(owner);
    expect(chooser).not.toHaveAttribute("aria-modal");
    expect(chooser).toHaveStyle({ position: "fixed" });
  });
});

describe("dispatchPreparedInstallChoice", () => {
  it("routes a newest-only target through gentle awareness", () => {
    const onInstall = vi.fn();
    const onChoose = vi.fn();
    const onAware = vi.fn();
    const single: PreparedInstallTargetChoice = {
      kind: "single",
      selection: selection("newest"),
    };

    dispatchPreparedInstallChoice(single, onInstall, onChoose, onAware);

    expect(onInstall).not.toHaveBeenCalled();
    expect(onChoose).not.toHaveBeenCalled();
    expect(onAware).toHaveBeenCalledWith(single.selection);
  });

  it("lets Escape close scan results before dismissing the chooser", () => {
    const onCancel = vi.fn();
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={anchor()}
        choice={choice()}
        scanStatus={scanStatus()}
        onSelect={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "TavernKeeper scan: Low concern; stale assessment.",
      }),
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "TavernKeeper Scan Results" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Choose a version for Alpha" })).toBeVisible();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("keeps the version selection live after a tapped scan panel is toggled", () => {
    const onSelect = vi.fn();
    render(
      <InstallVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={anchor()}
        choice={choice()}
        scanStatus={scanStatus()}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );
    const scan = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern; stale assessment.",
    });
    fireEvent.pointerDown(scan, { pointerType: "touch" });
    fireEvent.click(scan);
    fireEvent.pointerDown(scan, { pointerType: "touch" });
    fireEvent.click(scan);
    fireEvent.click(screen.getByRole("button", { name: "Latest from creator" }));

    expect(onSelect).toHaveBeenCalledWith(choice().newest.selection);
  });

  it("keeps a single exact scanned target direct", () => {
    const onInstall = vi.fn();
    const onAware = vi.fn();
    const single: PreparedInstallTargetChoice = {
      kind: "single",
      selection: selection("checked"),
    };

    dispatchPreparedInstallChoice(single, onInstall, vi.fn(), onAware);

    expect(onInstall).toHaveBeenCalledWith(single.selection);
    expect(onAware).not.toHaveBeenCalled();
  });
});
