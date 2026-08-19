import { describe, expect, it, vi } from "vitest";

import type { PreparedInstallSelection } from "../../src/lifecycle/lifecycle-coordinator";
import { InstallTargetFallbackBroker } from "../../src/lifecycle/install-target-fallback-broker";

const checked = {
  target: { kind: "checked", requestedSha: "a".repeat(40) },
} as unknown as Parameters<InstallTargetFallbackBroker["respond"]>[0];
const selected = {
  target: { kind: "newest", requestedSha: "b".repeat(40) },
} as unknown as PreparedInstallSelection;
const request = {
  projectId: "alpha",
  projectName: "Alpha",
  checked,
  newest: selected,
} as unknown as Parameters<InstallTargetFallbackBroker["request"]>[0];

describe("InstallTargetFallbackBroker", () => {
  it("publishes one request and resolves it exactly once", async () => {
    const broker = new InstallTargetFallbackBroker();
    const listener = vi.fn();
    broker.subscribe(listener);
    const result = broker.request(request);

    expect(broker.read()).toMatchObject({ projectId: "alpha", projectName: "Alpha" });
    expect(listener).toHaveBeenCalled();
    expect(broker.respond(selected)).toBe(true);
    expect(broker.respond(selected)).toBe(false);
    await expect(result).resolves.toBe(selected);
    expect(broker.read()).toBeNull();
  });

  it("returns null when the player cancels", async () => {
    const broker = new InstallTargetFallbackBroker();
    const result = broker.request(request);

    expect(broker.cancel()).toBe(true);
    expect(broker.cancel()).toBe(false);
    await expect(result).resolves.toBeNull();
  });
});
