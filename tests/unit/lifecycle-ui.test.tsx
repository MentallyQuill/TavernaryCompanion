import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActiveOperation } from "../../src/lifecycle/operation-lock";
import { createReceipt } from "../../src/lifecycle/operation-receipt";
import { CURRENT_ASSESSMENT_WARNING } from "../../src/trust/trust-copy";
import type { TrustPrompt } from "../../src/trust/trust-types";
import { AssessmentWarningDialog } from "../../src/ui/lifecycle/assessment-warning-dialog";
import { OperationTray } from "../../src/ui/lifecycle/operation-tray";

afterEach(() => document.body.replaceChildren());

const warning: Extract<TrustPrompt, { kind: "assessment-warning" }> = {
  kind: "assessment-warning",
  severity: "material",
  stale: false,
  reportUrl: "https://tavernary.org/scan/alpha",
  reviewDisabledReason: null,
  copy: CURRENT_ASSESSMENT_WARNING,
};

describe("lifecycle UI", () => {
  it("shows the exact mandatory warning actions", () => {
    render(
      <AssessmentWarningDialog
        projectName="Alpha"
        prompt={warning}
        onReview={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(CURRENT_ASSESSMENT_WARNING)).toBeVisible();
    expect(screen.getByRole("button", { name: "Scan Review" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Install anyway" })).toBeVisible();
  });

  it("keeps the decision pending after Scan Review and cancels with Escape", () => {
    const onReview = vi.fn();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <AssessmentWarningDialog
        projectName="Alpha"
        prompt={warning}
        onReview={onReview}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Scan Review" }));
    expect(onReview).toHaveBeenCalledWith(warning.reportUrl);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeVisible();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("uses text and danger styling for high concern and disables a missing review", () => {
    render(
      <AssessmentWarningDialog
        projectName="Alpha"
        prompt={{
          ...warning,
          severity: "high",
          reportUrl: null,
          reviewDisabledReason: "No TavernKeeper Scan Review link is available.",
        }}
        onReview={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Immediate danger")).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveClass("is-high");
    expect(screen.getByRole("button", { name: "Scan Review" })).toBeDisabled();
    expect(screen.getByText("No TavernKeeper Scan Review link is available.")).toBeVisible();
  });

  it("shows active progress and a durable verified receipt", () => {
    const active: ActiveOperation = { operationId: "install:alpha", phase: "verifying" };
    const receipt = createReceipt({
      id: "receipt-1",
      kind: "install",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "succeeded",
      completedThrough: "recorded",
      safeError: null,
      reloadRequired: true,
    });
    const { rerender } = render(<OperationTray active={active} receipt={null} />);
    expect(screen.getByText("Verifying installed state…")).toBeVisible();

    rerender(<OperationTray active={null} receipt={receipt} />);
    expect(screen.getByText("Alpha installed and verified")).toBeVisible();
    expect(screen.getByText("Reload required")).toBeVisible();
  });
});
