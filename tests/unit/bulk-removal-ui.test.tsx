import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";

import type { BulkRemovalPlan, BulkRemovalReceipt } from "../../src/lifecycle/bulk-removal";
import { createReceipt } from "../../src/lifecycle/operation-receipt";
import { BulkRemovalDialog } from "../../src/ui/lifecycle/bulk-removal-dialog";
import { BulkRemovalReceiptView } from "../../src/ui/lifecycle/bulk-removal-receipt";

afterEach(() => document.body.replaceChildren());

const plan: BulkRemovalPlan = {
  projectIds: ["alpha", "beta", "gamma"],
  impacts: [
    {
      projectId: "alpha",
      projectName: "Alpha",
      ownership: "managed",
      ownershipLabel: "Managed by Companion",
      installedKits: [{ id: "writer", title: "Writer Kit" }],
      activeKitAffected: true,
      removable: true,
      confirmation: "Uninstall Alpha?",
    },
    {
      projectId: "beta",
      projectName: "Beta",
      ownership: "external",
      ownershipLabel: "Installed outside Companion",
      installedKits: [],
      activeKitAffected: false,
      removable: true,
      confirmation: "Uninstall Beta?",
    },
    {
      projectId: "gamma",
      projectName: "Gamma",
      ownership: "managed",
      ownershipLabel: "Managed by Companion",
      installedKits: [],
      activeKitAffected: false,
      removable: true,
      confirmation: "Uninstall Gamma?",
    },
  ],
  affectedKits: [{ id: "writer", title: "Writer Kit" }],
  activeKitAffected: true,
  confirmable: true,
  fingerprint: "12345678",
};

it("makes aggregate ownership and Kit consequences visible before confirmation", () => {
  render(<BulkRemovalDialog plan={plan} onCancel={vi.fn()} onConfirm={vi.fn()} />);

  expect(screen.getByRole("dialog", { name: "Uninstall 3 extensions" })).toBeVisible();
  expect(screen.getByText("Writer Kit will become Partial.")).toBeVisible();
  expect(screen.getByText("The active Kit will show drift.")).toBeVisible();
  expect(screen.getByText("Installed outside Companion")).toBeVisible();
});

it("reports each result and restores failed projects for retry", () => {
  const results = [
    createReceipt({
      id: "alpha-remove",
      kind: "remove",
      projectId: "alpha",
      projectName: "Alpha",
      startedAt: "2026-08-19T00:00:00.000Z",
      finishedAt: "2026-08-19T00:00:01.000Z",
      status: "succeeded",
      safeError: null,
      reloadRequired: true,
    }),
    createReceipt({
      id: "beta-remove",
      kind: "remove",
      projectId: "beta",
      projectName: "Beta",
      startedAt: "2026-08-19T00:00:00.000Z",
      finishedAt: "2026-08-19T00:00:01.000Z",
      status: "failed",
      safeError: "Could not remove.",
      reloadRequired: false,
    }),
  ];
  const receipt: BulkRemovalReceipt = {
    formatVersion: 1,
    id: "bulk-1",
    kind: "bulk-remove",
    planFingerprint: "12345678",
    startedAt: "2026-08-19T00:00:00.000Z",
    completedAt: "2026-08-19T00:00:02.000Z",
    status: "partial",
    projectIds: ["alpha", "beta"],
    results,
    retryableProjectIds: ["beta"],
    reloadRequired: true,
  };
  const onRetryFailed = vi.fn();
  render(
    <BulkRemovalReceiptView
      receipt={receipt}
      onRetryFailed={onRetryFailed}
      onDismiss={vi.fn()}
      onReload={vi.fn()}
    />,
  );

  expect(screen.getByText("Alpha — Removed")).toBeVisible();
  expect(screen.getByText("Beta — Failed")).toBeVisible();
  expect(screen.getByText("Reload is required to finish applying changes.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Retry failed" }));
  expect(onRetryFailed).toHaveBeenCalledWith(["beta"]);
});
