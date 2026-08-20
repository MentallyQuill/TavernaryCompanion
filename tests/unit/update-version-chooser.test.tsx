import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TavernKeeperCardStatus } from "../../src/catalog/catalog-core";
import type { PreparedUpdateSelection } from "../../src/updates/update-types";
import { UpdateVersionChooser } from "../../src/ui/installed/update-version-chooser";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function selection(kind: "checked" | "newest"): PreparedUpdateSelection {
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
      internalName: "third-party/Alpha",
      installedSha: "1".repeat(40),
      repositoryUrl: "https://example.com/alpha.git",
      branch: "main",
      requestedSha,
    },
  };
}

function anchor(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "Update Alpha";
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
    state: "orange",
    riskLevel: "material",
    freshness: "stale",
    currentSha: "b".repeat(40),
    report: {
      reportId: "report-alpha",
      riskLevel: "material",
      headline: "Material concern",
      summary: "A dependency needs review.",
      minorCautions: 0,
      materialConcerns: 1,
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

describe("UpdateVersionChooser", () => {
  it("offers the exact scanned and newest targets without recommending either", () => {
    const updateButton = anchor();
    const onSelect = vi.fn();
    const selections = [selection("checked"), selection("newest")];
    render(
      <UpdateVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={updateButton}
        choice={{ notice: null, selections }}
        scanStatus={scanStatus()}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Update Alpha" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Latest scanned" })).toHaveAccessibleDescription(
      "Scanned Aug 17 · older than latest.",
    );
    expect(screen.getByRole("button", { name: "Latest from creator" })).toHaveAccessibleDescription(
      "Newer changes have not been scanned yet.",
    );
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/recommended/i);

    const scan = screen.getByRole("button", {
      name: "TavernKeeper scan: Material concern; stale assessment.",
    });
    fireEvent.click(scan);
    expect(screen.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();

    const checked = screen.getByRole("button", { name: "Latest scanned" });
    fireEvent.click(checked);
    fireEvent.click(checked);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(selections[0]);
    expect(updateButton).toHaveFocus();
  });

  it("does not show scan evidence from a different prepared revision", () => {
    const mismatched = scanStatus();
    mismatched.report = {
      ...mismatched.report!,
      reportId: "report-newer",
      scannedSha: "c".repeat(40),
    };
    render(
      <UpdateVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={anchor()}
        choice={{ notice: null, selections: [selection("checked"), selection("newest")] }}
        scanStatus={mismatched}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /TavernKeeper scan:/u })).not.toBeInTheDocument();
  });

  it("omits the scanned choice and explains when it is already installed", () => {
    render(
      <UpdateVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={anchor()}
        choice={{
          notice: "You already have the latest scanned version.",
          selections: [selection("newest")],
        }}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("You already have the latest scanned version.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Latest scanned" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Latest from creator" })).toBeEnabled();
  });

  it("cancels on Escape and restores focus to Update", () => {
    const updateButton = anchor();
    const onCancel = vi.fn();
    render(
      <UpdateVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={updateButton}
        choice={{ notice: null, selections: [selection("newest")] }}
        onSelect={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(updateButton).toHaveFocus();
  });
});
