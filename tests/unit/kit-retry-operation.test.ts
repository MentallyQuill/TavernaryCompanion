import { expect, it } from "vitest";

import type { KitOperation } from "../../src/kits/kit-plan";
import type { KitReceipt } from "../../src/kits/kit-receipt";
import { retryKitOperation } from "../../src/ui/popup-host";

it.each<KitOperation>(["install", "activate", "deactivate", "uninstall"])(
  "preserves the original %s operation when retrying",
  (operation) => {
    const receipt = {
      formatVersion: 1,
      kind: "kit-operation",
      id: "receipt",
      planId: "plan",
      operation,
      kitId: "kit",
      startedAt: "2026-08-18T00:00:00.000Z",
      completedAt: "2026-08-18T00:01:00.000Z",
      outcome: "failed",
      previousActiveKitId: null,
      activeKitId: null,
      projects: [],
      keptForOtherKits: [],
    } satisfies KitReceipt;

    expect(retryKitOperation(receipt)).toBe(operation);
  },
);
