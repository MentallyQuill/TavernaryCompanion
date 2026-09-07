import { fireEvent, render, screen, cleanup } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";
import { OperationTray } from "../../src/ui/lifecycle/operation-tray";
import { createReceipt } from "../../src/lifecycle/operation-receipt";
afterEach(cleanup);
it("shows the approved explanation and requires Replace and update", () => {
  const receipt = createReceipt({
    id: "r",
    kind: "update",
    projectId: "directive",
    projectName: "Directive",
    startedAt: "now",
    finishedAt: "now",
    status: "failed",
    safeError: null,
    reloadRequired: false,
  });
  receipt.replacementRecovery = "local-changes";
  const replace = vi.fn();
  const cancel = vi.fn();
  render(
    <OperationTray
      active={null}
      receipt={receipt}
      onReplaceUpdate={replace}
      onDismissReceipt={cancel}
    />,
  );
  expect(
    screen.getByText(
      "Directive couldn’t update because some of its local files have been changed.",
    ),
  ).toBeVisible();
  expect(
    screen.getByText(
      "Do you want to force-update? This will remove its current files and reinstall the version you selected.",
    ),
  ).toBeVisible();
  expect(replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Replace and update" }));
  expect(replace).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(cancel).toHaveBeenCalledOnce();
});
