import { expect, it } from "vitest";

import { toPersonalKitCardViewModel } from "../../src/kits/kit-view-model";
import type { PersonalKitV1 } from "../../src/kits/kit-types";

const kit: PersonalKitV1 = {
  formatVersion: 1,
  id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
  title: "Writer",
  description: "Writing tools",
  targetFrontend: "sillytavern",
  projectIds: ["alpha"],
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  origin: { kind: "local" },
};

it("maps Kit status to the primary action", () => {
  expect(toPersonalKitCardViewModel(kit, "active")).toMatchObject({
    originLabel: "Personal Kit",
    operationalStatus: "Active",
    primaryAction: { kind: "deactivate", label: "Deactivate" },
  });
  expect(toPersonalKitCardViewModel(kit, "saved").primaryAction).toEqual({
    kind: "install",
    label: "Install Kit",
  });
  expect(toPersonalKitCardViewModel(kit, "incomplete").primaryAction).toEqual({
    kind: "retry",
    label: "Retry",
  });
});
