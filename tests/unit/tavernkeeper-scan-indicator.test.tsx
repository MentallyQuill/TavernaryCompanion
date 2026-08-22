import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TavernKeeperCardStatus } from "../../src/catalog/catalog-core";
import { TavernKeeperScanIndicator } from "../../src/ui/projects/tavernkeeper-scan-indicator";

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  document.body.replaceChildren();
});

function status(overrides: Partial<TavernKeeperCardStatus> = {}): TavernKeeperCardStatus {
  return {
    state: "teal",
    riskLevel: "low",
    freshness: "current",
    currentSha: "a".repeat(40),
    report: {
      reportId: "report-alpha",
      riskLevel: "low",
      headline: "Low concern",
      summary: "No material security concerns were identified in the reviewed source.",
      minorCautions: 1,
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
      javascriptAnalysisStatus: "complete",
    },
    history: [],
    historyUrl: null,
    ...overrides,
  };
}

describe("TavernKeeperScanIndicator", () => {
  it("ports the scan panel into the owning native dialog", () => {
    const owner = document.createElement("dialog");
    owner.setAttribute("open", "");
    const container = document.createElement("div");
    owner.append(container);
    document.body.append(owner);
    render(<TavernKeeperScanIndicator projectId="alpha" status={status()} />, { container });

    fireEvent.click(
      screen.getByRole("button", {
        name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; current.",
      }),
    );

    expect(screen.getByRole("dialog", { name: "TavernKeeper Scan Results" }).parentElement).toBe(
      owner,
    );
  });

  it("opens the current assessment with literal evidence and safe source links", () => {
    render(<TavernKeeperScanIndicator projectId="alpha" status={status()} />);

    const trigger = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; current.",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: "TavernKeeper Scan Results" });
    expect(
      within(dialog).getByText(
        "No material security concerns were identified in the reviewed source.",
      ),
    ).toBeVisible();
    expect(within(dialog).getByText("1 minor caution")).toBeVisible();
    expect(within(dialog).getByText("0 material concerns")).toBeVisible();
    expect(within(dialog).getByText("0 high-danger findings")).toBeVisible();
    const source = within(dialog).getByRole("link", { name: /Browse scanned source/ });
    expect(source).toHaveTextContent("aaaaaaa");
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", expect.stringContaining("noopener"));
    const report = within(dialog).getByRole("link", { name: /View full report/ });
    expect(report).toHaveAttribute(
      "href",
      "https://tavernary.org/security/tavernkeeper/reports/report-alpha/",
    );
    expect(report).toHaveAttribute("target", "_blank");
  });

  it("separates low observed concern from incomplete scan coverage", () => {
    const incomplete = status();
    incomplete.report = {
      ...incomplete.report!,
      javascriptAnalysisStatus: "incomplete",
    };
    render(<TavernKeeperScanIndicator projectId="alpha" status={incomplete} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "TavernKeeper scan: Low concern observed; scan incomplete; current.",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "TavernKeeper Scan Results" });
    expect(within(dialog).getByText("Low concern observed")).toBeVisible();
    expect(within(dialog).getByText("Scan incomplete")).toBeVisible();
    expect(dialog).toHaveTextContent(
      "TavernKeeper found low concern in the code it analyzed. Parts of the JavaScript/TypeScript scan were incomplete, so this is not a complete result.",
    );
  });

  it.each([
    ["legacy", "Coverage not recorded"],
    [null, "Coverage unavailable in cached catalog"],
  ] as const)("labels %s report coverage without changing risk color", (coverage, label) => {
    const older = status();
    older.report = {
      ...older.report!,
      javascriptAnalysisStatus: coverage,
    };
    render(<TavernKeeperScanIndicator projectId="alpha" status={older} />);

    const trigger = screen.getByRole("button", {
      name: `TavernKeeper scan: Low concern observed; ${label.toLowerCase()}; current.`,
    });
    fireEvent.click(trigger);

    const marker = screen.getByText(label);
    expect(marker).toBeVisible();
    expect(trigger).toHaveClass("state-teal");
    expect(marker.parentElement).toHaveClass(
      coverage === "legacy" ? "coverage-legacy" : "coverage-unavailable",
    );
  });

  it("keeps a tapped scan panel open when the touch pointer leaves", () => {
    vi.useFakeTimers();
    render(<TavernKeeperScanIndicator projectId="alpha" status={status()} />);
    const trigger = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; current.",
    });

    fireEvent.pointerDown(trigger, { pointerType: "touch" });
    fireEvent.click(trigger);
    fireEvent.pointerLeave(trigger, { pointerType: "touch" });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
  });

  it("keeps the first pointer click open after hover and toggles on the next click", () => {
    render(<TavernKeeperScanIndicator projectId="alpha" status={status()} />);
    const trigger = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; current.",
    });

    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    fireEvent.pointerDown(trigger, { pointerType: "mouse" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();

    fireEvent.pointerDown(trigger, { pointerType: "mouse" });
    fireEvent.click(trigger);
    expect(
      screen.queryByRole("dialog", { name: "TavernKeeper Scan Results" }),
    ).not.toBeInTheDocument();
  });

  it("uses literal unsupported, unassessed, and changed-revision stale language", () => {
    const view = render(
      <TavernKeeperScanIndicator
        projectId="alpha"
        status={status({
          state: "unsupported",
          riskLevel: null,
          freshness: "unsupported",
          currentSha: null,
          report: null,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "TavernKeeper scan: Unsupported source." }));
    expect(screen.getByText(/scanning is not supported/)).toBeVisible();

    view.rerender(
      <TavernKeeperScanIndicator
        projectId="alpha"
        status={status({
          state: "gray",
          riskLevel: null,
          freshness: "unassessed",
          report: null,
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "TavernKeeper scan: Not assessed." })).toBeVisible();

    view.rerender(
      <TavernKeeperScanIndicator
        projectId="alpha"
        status={status({ freshness: "stale", currentSha: "b".repeat(40) })}
      />,
    );
    const stale = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; stale assessment.",
    });
    fireEvent.click(stale);
    fireEvent.click(stale);
    expect(screen.getByText(/creator has published changes since this scan/)).toBeVisible();
    expect(document.querySelector('svg[data-icon="clock"]')).toBeVisible();
  });

  it("opens the assessment when its trigger receives keyboard focus", () => {
    render(<TavernKeeperScanIndicator projectId="alpha" status={status()} />);
    const trigger = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; current.",
    });

    act(() => trigger.focus());

    expect(screen.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
  });

  it("explains a same-revision stale assessment as due for refresh", () => {
    render(<TavernKeeperScanIndicator projectId="alpha" status={status({ freshness: "stale" })} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; stale assessment.",
      }),
    );

    expect(
      screen.getByText(/this version was scanned, but the assessment is due for refresh/i),
    ).toBeVisible();
  });

  it("dismisses with Escape and restores focus to the scan trigger", () => {
    render(<TavernKeeperScanIndicator projectId="alpha" status={status()} />);
    const trigger = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; current.",
    });
    fireEvent.click(trigger);
    const hostEscape = vi.fn();
    window.addEventListener("keydown", hostEscape);
    fireEvent.keyDown(trigger, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(hostEscape).not.toHaveBeenCalled();
    window.removeEventListener("keydown", hostEscape);
  });

  it("links each recent conclusion to its exact report", () => {
    const current = status().report!;
    const prior = {
      ...current,
      reportId: "report-prior",
      riskLevel: "material" as const,
      javascriptAnalysisStatus: "incomplete" as const,
      assessedAt: "2026-08-01T00:00:00.000Z",
      reportUrl: "https://tavernary.org/security/tavernkeeper/reports/report-prior/",
    };
    const legacy = {
      ...current,
      reportId: "report-legacy",
      javascriptAnalysisStatus: "legacy" as const,
      assessedAt: "2026-08-10T00:00:00.000Z",
      reportUrl: "https://tavernary.org/security/tavernkeeper/reports/report-legacy/",
    };
    render(
      <TavernKeeperScanIndicator
        projectId="alpha"
        status={status({
          history: [prior, legacy, current],
          historyUrl: "/security/tavernkeeper/history/source-alpha/",
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; current.",
      }),
    );

    const history = screen.getByRole("group", { name: "Recent TavernKeeper scan history" });
    expect(within(history).getAllByRole("link")).toHaveLength(3);
    expect(
      within(history).getByRole("img", { name: /material concern.*scan incomplete/iu }),
    ).toHaveClass("coverage-incomplete");
    expect(
      within(history).getByRole("img", { name: /low concern.*coverage not recorded/iu }),
    ).toHaveClass("coverage-legacy");
    expect(within(history).getByRole("img", { name: /low concern.*scan complete/iu })).toHaveClass(
      "coverage-complete",
    );
    expect(screen.getByRole("link", { name: /View scan history/ })).toHaveAttribute(
      "href",
      "https://tavernary.org/security/tavernkeeper/history/source-alpha/",
    );
  });

  it("matches Tavernary hover, focus routing, and assessment copy", () => {
    const dirty = status();
    dirty.report = {
      ...dirty.report!,
      summary: `A complete sentence. Findings: ${"f".repeat(64)}`,
    };
    render(<TavernKeeperScanIndicator projectId="alpha" status={dirty} />);
    const trigger = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; current.",
    });

    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    const dialog = screen.getByRole("dialog", { name: "TavernKeeper Scan Results" });
    expect(dialog).toHaveTextContent("A complete sentence.");
    expect(dialog).not.toHaveTextContent("Findings:");
    expect(within(dialog).queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(within(dialog).getByText("current")).toBeVisible();

    fireEvent.keyDown(trigger, { key: "Tab" });
    expect(within(dialog).getByRole("link", { name: /Browse scanned source/ })).toHaveFocus();
    fireEvent.keyDown(within(dialog).getByRole("link", { name: /Browse scanned source/ }), {
      key: "Tab",
      shiftKey: true,
    });
    expect(trigger).toHaveFocus();
  });
});
