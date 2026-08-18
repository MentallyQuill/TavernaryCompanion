import { describe, expect, it, vi } from "vitest";

import { OperationInProgressError, OperationLock } from "../../src/lifecycle/operation-lock";
import { deferred } from "../helpers/catalog-fixtures";

describe("OperationLock", () => {
  it("publishes phases and rejects reentrant operations without queuing", async () => {
    const lock = new OperationLock();
    const subscriber = vi.fn();
    lock.subscribe(subscriber);
    const pending = deferred<void>();
    const first = lock.runExclusive("install:alpha", async ({ setPhase }) => {
      setPhase("host-request");
      await pending.promise;
      return "done";
    });

    await expect(lock.runExclusive("install:beta", async () => "never")).rejects.toThrow(
      OperationInProgressError,
    );
    expect(lock.read()).toEqual({ operationId: "install:alpha", phase: "host-request" });
    pending.resolve();
    await expect(first).resolves.toBe("done");
    expect(lock.read()).toBeNull();
    expect(subscriber).toHaveBeenLastCalledWith(null);
  });
});
