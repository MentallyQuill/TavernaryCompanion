import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";
import type { KitPlan } from "../../src/kits/kit-plan";
import { computeInstallTargetBinding } from "../../src/kits/kit-install-targets";
import { KitPreflightDialog } from "../../src/ui/kits/kit-preflight-dialog";

afterEach(cleanup);

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
  expect(screen.getByText("Scanned Aug 17 · older than latest.")).toBeVisible();
  expect(screen.getByText("Newer changes have not been scanned yet.")).toBeVisible();
  fireEvent.click(screen.getByRole("radio", { name: "Latest scanned for Alpha" }));
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

it("reviews legacy installs without asking the player to choose an unavailable version", () => {
  const confirm = vi.fn();
  const plan: KitPlan = {
    id: "legacy-plan",
    operation: "install",
    kitId: "legacy-kit",
    catalogGeneratedAt: "2026-08-18T00:00:00.000Z",
    catalogBinding: "legacy-catalog-binding",
    inventoryFingerprint: "legacy-fp",
    requiredProjectIds: ["alpha"],
    actionableProjectIds: ["alpha"],
    installTargetsPrepared: true,
    install: [
      {
        projectId: "alpha",
        projectName: "Alpha",
        internalName: null,
        targetChoice: {
          kind: "single",
          target: { kind: "newest", requestedSha: null, resolvedAt: null },
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
    warnings: [],
    blockingIssues: [],
    reloadRequired: true,
  };

  render(
    <KitPreflightDialog
      plan={plan}
      onCancel={() => undefined}
      onReview={() => undefined}
      onConfirm={confirm}
    />,
  );

  expect(screen.getByText("Companion will install the versions shown below.")).toBeVisible();
  expect(screen.getByText("SillyTavern will install the creator’s current version.")).toBeVisible();
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Install Kit" })).toBeEnabled();
});
