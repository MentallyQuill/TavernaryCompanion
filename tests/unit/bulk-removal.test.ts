import { expect, it, vi } from "vitest";

import {
  BulkRemovalPlanChangedError,
  executeBulkRemoval,
  parseBulkRemovalReceipt,
  prepareBulkRemoval,
} from "../../src/lifecycle/bulk-removal";
import { createReceipt, type LifecycleReceipt } from "../../src/lifecycle/operation-receipt";
import type { RemovalImpact } from "../../src/lifecycle/removal-impact";

function impact(projectId: string, change: Partial<RemovalImpact> = {}): RemovalImpact {
  return {
    projectId,
    projectName: projectId.toUpperCase(),
    ownership: "managed",
    ownershipLabel: "Managed by Companion",
    installedKits: [],
    activeKitAffected: false,
    removable: true,
    confirmation: `Uninstall ${projectId}?`,
    ...change,
  };
}

function receipt(projectId: string, status: LifecycleReceipt["status"]): LifecycleReceipt {
  return createReceipt({
    id: `remove-${projectId}`,
    kind: "remove",
    projectId,
    projectName: projectId.toUpperCase(),
    startedAt: "2026-08-19T00:00:00.000Z",
    finishedAt: "2026-08-19T00:00:01.000Z",
    status,
    safeError: status === "succeeded" ? null : "Could not remove.",
    reloadRequired: status === "succeeded",
  });
}

it("deduplicates selected projects and aggregates Kit impact", async () => {
  const lifecycle = {
    previewRemoval: vi.fn(async (id: string) =>
      impact(id, {
        installedKits: [{ id: "writers", title: "Writers", installedProjectCount: 3 }],
        activeKitAffected: id === "alpha",
      }),
    ),
    remove: vi.fn(),
  };

  const plan = await prepareBulkRemoval(lifecycle, ["alpha", "beta", "alpha"]);

  expect(plan.projectIds).toEqual(["alpha", "beta"]);
  expect(plan.affectedKits).toEqual([
    { id: "writers", title: "Writers", resultingStatus: "Partial" },
  ]);
  expect(plan.activeKitAffected).toBe(true);
  expect(plan.confirmable).toBe(true);
});

it("revalidates before sequential removal and keeps failed projects retryable", async () => {
  const lifecycle = {
    previewRemoval: vi.fn(async (id: string) => impact(id)),
    remove: vi
      .fn<(id: string) => Promise<LifecycleReceipt>>()
      .mockResolvedValueOnce(receipt("alpha", "succeeded"))
      .mockResolvedValueOnce(receipt("beta", "failed")),
  };
  const plan = await prepareBulkRemoval(lifecycle, ["alpha", "beta"]);

  const result = await executeBulkRemoval(
    lifecycle,
    plan,
    () => "bulk-1",
    () => "2026-08-19T00:00:02.000Z",
  );

  expect(lifecycle.remove.mock.calls).toEqual([["alpha"], ["beta"]]);
  expect(result.status).toBe("partial");
  expect(result.retryableProjectIds).toEqual(["beta"]);
  expect(result.reloadRequired).toBe(true);
  expect(parseBulkRemovalReceipt(result)).toEqual(result);
});

it("rejects a changed preflight before removing anything", async () => {
  let previews = 0;
  const lifecycle = {
    previewRemoval: vi.fn(async (id: string) => {
      previews += 1;
      return impact(id, { ownership: previews > 1 ? "external" : "managed" });
    }),
    remove: vi.fn(),
  };
  const plan = await prepareBulkRemoval(lifecycle, ["alpha"]);

  await expect(executeBulkRemoval(lifecycle, plan, () => "bulk-1")).rejects.toBeInstanceOf(
    BulkRemovalPlanChangedError,
  );
  expect(lifecycle.remove).not.toHaveBeenCalled();
});

it("rejects preflight when an affected Kit member count changes", async () => {
  let previews = 0;
  const lifecycle = {
    previewRemoval: vi.fn(async (id: string) => {
      previews += 1;
      return impact(id, {
        installedKits: [
          {
            id: "writers",
            title: "Writers",
            installedProjectCount: previews > 1 ? 1 : 2,
          },
        ],
      });
    }),
    remove: vi.fn(),
  };
  const plan = await prepareBulkRemoval(lifecycle, ["alpha"]);

  await expect(executeBulkRemoval(lifecycle, plan, () => "bulk-1")).rejects.toBeInstanceOf(
    BulkRemovalPlanChangedError,
  );
  expect(lifecycle.remove).not.toHaveBeenCalled();
});

it("rejects malformed persisted aggregate receipts", () => {
  expect(parseBulkRemovalReceipt({ kind: "bulk-remove", status: "partial" })).toBeNull();
  expect(parseBulkRemovalReceipt({ kind: "remove", id: "bulk-1" })).toBeNull();
  const validResult = receipt("alpha", "succeeded");
  expect(
    parseBulkRemovalReceipt({
      formatVersion: 1,
      id: "bulk-1",
      kind: "bulk-remove",
      planFingerprint: "12345678",
      startedAt: "2026-08-19T00:00:00.000Z",
      completedAt: "2026-08-19T00:00:01.000Z",
      status: "succeeded",
      projectIds: ["alpha"],
      results: [{ ...validResult, status: "invented" }],
      retryableProjectIds: [],
      reloadRequired: true,
    }),
  ).toBeNull();
});
