import { fireEvent, render, screen } from "@testing-library/preact";
import { expect, it, vi } from "vitest";
import type { KitPlan } from "../../src/kits/kit-plan";
import { KitPreflightDialog } from "../../src/ui/kits/kit-preflight-dialog";

it("consolidates warnings, preserves review, and binds approval to the plan", () => {
  const confirm = vi.fn();
  const review = vi.fn();
  const plan: KitPlan = {
    id: "plan",
    operation: "activate",
    kitId: "kit",
    catalogGeneratedAt: "2026-08-18T00:00:00.000Z",
    inventoryFingerprint: "fp",
    requiredProjectIds: ["alpha"],
    install: [{ projectId: "alpha", projectName: "Alpha", internalName: null }],
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
  fireEvent.click(screen.getByRole("button", { name: "Scan Review" }));
  expect(review).toHaveBeenCalledWith("https://example.com/scan");
  expect(screen.getByRole("button", { name: "Install anyway" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Install anyway" }));
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({ planId: "plan", acceptedWarningProjectIds: ["alpha"] }),
  );
});
