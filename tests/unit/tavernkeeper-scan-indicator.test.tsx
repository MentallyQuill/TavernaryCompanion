import { fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";

import type { TavernKeeperCardStatus } from "../../src/catalog/catalog-core";
import { TavernKeeperScanIndicator } from "../../src/ui/projects/tavernkeeper-scan-indicator";

afterEach(() => document.body.replaceChildren());

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
    },
    history: [],
    historyUrl: null,
    ...overrides,
  };
}

describe("TavernKeeperScanIndicator", () => {
  it("opens the current assessment with literal evidence and safe source links", () => {
    render(<TavernKeeperScanIndicator projectId="alpha" status={status()} />);

    const trigger = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern · current scan",
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

  it("uses literal unsupported, unassessed, and stale state language", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "TavernKeeper scan: Scan unsupported" }));
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
    expect(screen.getByRole("button", { name: "TavernKeeper scan: Not assessed" })).toBeVisible();

    view.rerender(
      <TavernKeeperScanIndicator projectId="alpha" status={status({ freshness: "stale" })} />,
    );
    const stale = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern · scan not current",
    });
    fireEvent.click(stale);
    fireEvent.click(stale);
    expect(screen.getByText(/assessment covers an older commit/)).toBeVisible();
    expect(document.querySelector('svg[data-icon="clock"]')).toBeVisible();
  });

  it("dismisses with Escape and restores focus to the scan trigger", () => {
    render(<TavernKeeperScanIndicator projectId="alpha" status={status()} />);
    const trigger = screen.getByRole("button", {
      name: "TavernKeeper scan: Low concern · current scan",
    });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("links each recent conclusion to its exact report", () => {
    const current = status().report!;
    const prior = {
      ...current,
      reportId: "report-prior",
      riskLevel: "material" as const,
      assessedAt: "2026-08-01T00:00:00.000Z",
      reportUrl: "https://tavernary.org/security/tavernkeeper/reports/report-prior/",
    };
    render(
      <TavernKeeperScanIndicator
        projectId="alpha"
        status={status({
          history: [prior, current],
          historyUrl: "/security/tavernkeeper/history/source-alpha/",
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "TavernKeeper scan: Low concern · current scan" }),
    );

    const history = screen.getByRole("group", { name: "Recent TavernKeeper scan history" });
    expect(within(history).getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /View scan history/ })).toHaveAttribute(
      "href",
      "https://tavernary.org/security/tavernkeeper/history/source-alpha/",
    );
  });
});
