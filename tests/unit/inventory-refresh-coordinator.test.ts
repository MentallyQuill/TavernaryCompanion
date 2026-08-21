import { expect, it, vi } from "vitest";

import * as popupHost from "../../src/ui/popup-host";

type InventoryRefreshSnapshot = {
  loadState: "loading" | "ready" | "error";
  refreshing: boolean;
};

interface InventoryRefreshCoordinatorContract {
  read(): InventoryRefreshSnapshot;
  request(): Promise<boolean>;
}

type CreateInventoryRefreshCoordinator = (
  refresh: () => Promise<void>,
) => InventoryRefreshCoordinatorContract;

function coordinatorFactory(): CreateInventoryRefreshCoordinator | undefined {
  return (
    popupHost as typeof popupHost & {
      createInventoryRefreshCoordinator?: CreateInventoryRefreshCoordinator;
    }
  ).createInventoryRefreshCoordinator;
}

it("keeps one serialized refresh drain and retains readiness across popup consumers", async () => {
  const createCoordinator = coordinatorFactory();
  expect(createCoordinator).toBeTypeOf("function");
  if (!createCoordinator) return;

  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let calls = 0;
  let active = 0;
  let maximumActive = 0;
  const coordinator = createCoordinator(async () => {
    calls += 1;
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    if (calls === 1) await firstGate;
    active -= 1;
  });

  const first = coordinator.request();
  const second = coordinator.request();
  expect(second).toBe(first);
  expect(coordinator.read()).toEqual({ loadState: "loading", refreshing: true });

  releaseFirst();
  await expect(first).resolves.toBe(true);
  expect(calls).toBe(2);
  expect(maximumActive).toBe(1);
  expect(coordinator.read()).toEqual({ loadState: "ready", refreshing: false });
});

it("retains an initial error until a later runtime-owned retry succeeds", async () => {
  const createCoordinator = coordinatorFactory();
  expect(createCoordinator).toBeTypeOf("function");
  if (!createCoordinator) return;

  const refresh = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error("discover failed"))
    .mockResolvedValueOnce(undefined);
  const coordinator = createCoordinator(refresh);

  await expect(coordinator.request()).resolves.toBe(false);
  expect(coordinator.read()).toEqual({ loadState: "error", refreshing: false });

  await expect(coordinator.request()).resolves.toBe(true);
  expect(coordinator.read()).toEqual({ loadState: "ready", refreshing: false });
});
