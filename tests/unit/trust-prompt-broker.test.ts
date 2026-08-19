import { expect, it, vi } from "vitest";

import { catalogProjectFixture } from "../helpers/catalog-fixtures";
import { TrustPromptBroker } from "../../src/lifecycle/trust-prompt-broker";
import { UNSANDBOXED_CODE_DISCLOSURE } from "../../src/trust/trust-copy";

it("keeps one prompt pending until the UI explicitly answers it", async () => {
  const broker = new TrustPromptBroker();
  const subscriber = vi.fn();
  broker.subscribe(subscriber);
  const pending = broker.request(
    { kind: "unsandboxed-disclosure", copy: UNSANDBOXED_CODE_DISCLOSURE },
    catalogProjectFixture({ id: "alpha" }),
  );

  expect(broker.read()).toMatchObject({ project: { id: "alpha" } });
  broker.respond(true);
  await expect(pending).resolves.toBe(true);
  expect(broker.read()).toBeNull();
  expect(subscriber).toHaveBeenLastCalledWith(null);
});
