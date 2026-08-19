import { act, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActiveOperation } from "../../src/lifecycle/operation-lock";
import { createReceipt } from "../../src/lifecycle/operation-receipt";
import { CURRENT_ASSESSMENT_WARNING } from "../../src/trust/trust-copy";
import type { TrustPrompt } from "../../src/trust/trust-types";
import { AssessmentWarningDialog } from "../../src/ui/lifecycle/assessment-warning-dialog";
import { OperationTray } from "../../src/ui/lifecycle/operation-tray";
import { OperationReceipt } from "../../src/ui/lifecycle/operation-receipt";

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

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
    expect(screen.getByText("Needs a closer look")).toBeVisible();
    expect(screen.getByRole("button", { name: "View check" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Go back" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Install this version" })).toBeVisible();
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

    fireEvent.click(screen.getByRole("button", { name: "View check" }));
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

    expect(screen.getByText("High concern")).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveClass("is-high");
    expect(screen.getByRole("button", { name: "View check" })).toBeDisabled();
    expect(screen.getByText("No TavernKeeper Scan Review link is available.")).toBeVisible();
  });

  it("shows active progress while SillyTavern verification is running", () => {
    const active: ActiveOperation = { operationId: "install:alpha", phase: "verifying" };
    render(<OperationTray active={active} receipt={null} />);

    expect(screen.getByText("Verifying installed state…")).toBeVisible();
  });

  it("shows successful installs as a useful body-level notification", () => {
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
    const panel = document.createElement("div");
    panel.className = "tavernary-companion-root";
    document.body.append(panel);

    render(<OperationTray active={null} receipt={receipt} />, { container: panel });

    const notification = screen.getByRole("status", { name: "Installation complete" });
    expect(notification.parentElement).toBe(document.body);
    expect(notification).toHaveTextContent("Alpha installed");
    expect(notification).toHaveTextContent(
      "Verified in SillyTavern · Reload to finish installation",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("keeps install success plain and puts hashes only inside closed Details", () => {
    const receipt = createReceipt({
      id: "receipt-target",
      kind: "install",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "succeeded",
      completedThrough: "recorded",
      safeError: null,
      reloadRequired: true,
      installProvenance: {
        targetKind: "checked",
        requestedSha: "a".repeat(40),
        installedSha: "a".repeat(40),
        catalogGeneratedAt: "2026-08-18T09:00:00.000Z",
        tavernKeeperReportId: "report-alpha",
      },
      tavernKeeperReportUrl: "https://tavernary.org/scan/alpha",
    });

    render(<OperationReceipt receipt={receipt} />);

    expect(screen.getByRole("heading", { name: "Installed the checked version." })).toBeVisible();
    const details = screen.getByText("Details").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(
      screen.getAllByText("a".repeat(40)).every((value) => value.closest("details") === details),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "TavernKeeper check" }).closest("details")).toBe(
      details,
    );
  });

  it("announces the selected version in a successful install notification", () => {
    const receipt = createReceipt({
      id: "receipt-newest",
      kind: "install",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "succeeded",
      completedThrough: "recorded",
      safeError: null,
      reloadRequired: true,
      installProvenance: {
        targetKind: "newest",
        requestedSha: "b".repeat(40),
        installedSha: "b".repeat(40),
        catalogGeneratedAt: "2026-08-18T09:00:00.000Z",
        tavernKeeperReportId: null,
      },
    });

    render(<OperationTray active={null} receipt={receipt} />);

    expect(screen.getByRole("status", { name: "Installation complete" })).toHaveTextContent(
      "Installed the newest version.",
    );
  });

  it("keeps a successful update visible until the user reloads", () => {
    vi.useFakeTimers();
    const onDismissReceipt = vi.fn();
    const onReload = vi.fn();
    const receipt = createReceipt({
      id: "receipt-update",
      kind: "update",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "succeeded",
      completedThrough: "recorded",
      safeError: null,
      reloadRequired: true,
      installProvenance: {
        targetKind: "checked",
        requestedSha: "a".repeat(40),
        installedSha: "a".repeat(40),
        catalogGeneratedAt: "2026-08-18T09:00:00.000Z",
        tavernKeeperReportId: "report-alpha",
      },
    });

    render(
      <OperationTray
        active={null}
        receipt={receipt}
        onDismissReceipt={onDismissReceipt}
        onReload={onReload}
      />,
    );

    expect(screen.getByRole("status", { name: "Update complete" })).toHaveTextContent(
      "Updated to the latest scanned version. Reload to apply updates",
    );
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onDismissReceipt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reload now" }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("offers reload after a verified update whose profile record could not be saved", () => {
    const receipt = createReceipt({
      id: "receipt-update-unrecorded",
      kind: "update",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "updated-unrecorded",
      completedThrough: "verified",
      failedAt: "recorded",
      safeError:
        "The extension was updated and verified, but Companion could not save its update record. Reopen Companion to reconcile it.",
      reloadRequired: true,
    });

    render(<OperationTray active={null} receipt={receipt} onReload={vi.fn()} />);

    expect(screen.getByRole("status", { name: "Update complete" })).toHaveTextContent(
      "could not save its update record",
    );
    expect(screen.getByRole("button", { name: "Reload now" })).toBeEnabled();
  });

  it("dismisses a successful receipt when its notification is clicked", () => {
    const onDismissReceipt = vi.fn();
    const receipt = createReceipt({
      id: "receipt-2",
      kind: "remove",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "succeeded",
      completedThrough: "recorded",
      safeError: null,
      reloadRequired: false,
    });
    render(<OperationTray active={null} receipt={receipt} onDismissReceipt={onDismissReceipt} />);

    const dismiss = screen.getByRole("button", {
      name: "Dismiss notification: Alpha removed. Verified removed from SillyTavern",
    });
    expect(dismiss).toHaveTextContent("Verified removed from SillyTavern");
    fireEvent.click(dismiss);

    expect(onDismissReceipt).toHaveBeenCalledOnce();
  });

  it("dismisses after 4.5 active seconds and pauses while hovered", () => {
    vi.useFakeTimers();
    const onDismissReceipt = vi.fn();
    const receipt = createReceipt({
      id: "receipt-3",
      kind: "install",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "succeeded",
      completedThrough: "recorded",
      safeError: null,
      reloadRequired: false,
    });
    render(<OperationTray active={null} receipt={receipt} onDismissReceipt={onDismissReceipt} />);
    const dismiss = screen.getByRole("button", {
      name: "Dismiss notification: Alpha installed. Verified in SillyTavern · Managed by Companion",
    });

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    fireEvent.pointerEnter(dismiss);
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(onDismissReceipt).not.toHaveBeenCalled();

    fireEvent.pointerLeave(dismiss);
    act(() => {
      vi.advanceTimersByTime(1_499);
    });
    expect(onDismissReceipt).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismissReceipt).toHaveBeenCalledOnce();
  });

  it("pauses automatic dismissal while the notification has keyboard focus", () => {
    vi.useFakeTimers();
    const onDismissReceipt = vi.fn();
    const receipt = createReceipt({
      id: "receipt-keyboard",
      kind: "install",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "succeeded",
      completedThrough: "recorded",
      safeError: null,
      reloadRequired: false,
    });
    render(<OperationTray active={null} receipt={receipt} onDismissReceipt={onDismissReceipt} />);
    const dismiss = screen.getByRole("button", {
      name: "Dismiss notification: Alpha installed. Verified in SillyTavern · Managed by Companion",
    });

    dismiss.focus();
    expect(dismiss).toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(onDismissReceipt).not.toHaveBeenCalled();

    dismiss.blur();
    act(() => {
      vi.advanceTimersByTime(4_500);
    });
    expect(onDismissReceipt).toHaveBeenCalledOnce();
  });

  it("keeps an incomplete receipt durable and detailed", () => {
    const receipt = createReceipt({
      id: "receipt-4",
      kind: "install",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-18T10:00:00.000Z",
      finishedAt: "2026-08-18T10:01:00.000Z",
      status: "verification-failed",
      completedThrough: "host-accepted",
      failedAt: "verified",
      safeError: "SillyTavern could not verify the installed extension.",
      reloadRequired: false,
    });
    render(<OperationTray active={null} receipt={receipt} />);

    expect(screen.getByRole("region", { name: "Operation receipt" })).toHaveTextContent(
      "Alpha install did not complete",
    );
    expect(screen.getByRole("list")).toHaveTextContent("Verified: failed");
  });

  it("offers retry when installed-extension discovery fails", () => {
    const retry = vi.fn();
    render(
      <OperationTray
        active={null}
        receipt={null}
        error="Could not refresh installed extensions."
        onRetryError={retry}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
