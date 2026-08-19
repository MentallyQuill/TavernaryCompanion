import { fireEvent, render, screen } from "@testing-library/preact";
import { expect, it, vi } from "vitest";
import type { KitPlan } from "../../src/kits/kit-plan";
import { computeInstallTargetBinding } from "../../src/kits/kit-install-targets";
import { KitPreflightDialog } from "../../src/ui/kits/kit-preflight-dialog";

it("consolidates warnings, preserves review, and binds approval to the plan", () => {
  const confirm = vi.fn();
  const review = vi.fn();
  const plan: KitPlan = {
    id: "plan",
    operation: "activate",
    kitId: "kit",
    catalogGeneratedAt: "2026-08-18T00:00:00.000Z",
    catalogBinding: "catalog-binding",
    inventoryFingerprint: "fp",
    requiredProjectIds: ["alpha"],
    actionableProjectIds: ["alpha"],
    installTargetsPrepared: true,
    install: [
      {
        projectId: "alpha",
        projectName: "Alpha",
        internalName: null,
        targetChoice: {
          kind: "choose",
          checked: {
            target: {
              kind: "checked",
              requestedSha: "a".repeat(40),
              checkedAt: "2026-08-17T00:00:00.000Z",
              reportId: "report-alpha",
              reportUrl: "https://example.com/scan",
            },
            disabledReason: null,
          },
          newest: {
            kind: "newest",
            requestedSha: "b".repeat(40),
            resolvedAt: "2026-08-19T00:00:00.000Z",
          },
        },
      },
    ],
    enable: [],
    disable: [],
    remove: [],
    alreadyManaged: [],
    externalContext: [],
    contextOnly: [],
    keptForOtherKits: [],
    warnings: [
      {
        projectId: "alpha",
        projectName: "Alpha",
        severity: "material",
        freshness: "current",
        reportUrl: "https://example.com/scan",
        scannedSha: "a".repeat(40),
      },
    ],
    blockingIssues: [],
    reloadRequired: true,
  };
  render(
    <KitPreflightDialog
      plan={plan}
      onCancel={() => undefined}
      onReview={review}
      onConfirm={confirm}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "View check" }));
  expect(review).toHaveBeenCalledWith("https://example.com/scan");
  expect(screen.getByText("Before you install")).toBeVisible();
  expect(screen.getByText(/Needs a closer look/)).toBeVisible();
  expect(screen.getByRole("dialog")).not.toHaveTextContent(/security concerns|immediate danger/i);
  const confirmButton = screen.getByRole("button", { name: "Install anyway" });
  expect(confirmButton).toBeDisabled();
  fireEvent.click(screen.getByRole("radio", { name: "Checked version for Alpha" }));
  expect(confirmButton).toBeEnabled();
  fireEvent.click(confirmButton);
  const selectedInstallTargets = [
    {
      projectId: "alpha",
      target:
        plan.install[0].targetChoice!.kind === "choose"
          ? plan.install[0].targetChoice!.checked.target
          : plan.install[0].targetChoice!.target,
    },
  ];
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      planId: "plan",
      catalogBinding: "catalog-binding",
      acceptedWarningProjectIds: ["alpha"],
      selectedInstallTargets,
      installTargetBinding: computeInstallTargetBinding(selectedInstallTargets),
    }),
  );
});
