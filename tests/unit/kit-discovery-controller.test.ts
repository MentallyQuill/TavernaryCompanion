import { expect, it } from "vitest";

import { createKitDiscoveryController } from "../../src/kits/kit-discovery-controller";
import { catalogFixture } from "../helpers/catalog-fixtures";

it("segments published and personal Kits and searches local definitions", () => {
  const controller = createKitDiscoveryController({
    catalog: catalogFixture(),
    personal: [
      {
        formatVersion: 1,
        id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
        title: "Writer",
        description: "Long form",
        targetFrontend: "sillytavern",
        projectIds: [],
        createdAt: "2026-08-18T00:00:00.000Z",
        updatedAt: "2026-08-18T00:00:00.000Z",
        origin: { kind: "local" },
      },
    ],
    statuses: new Map(),
  });
  controller.setSegment("personal");
  controller.setSearch("writer");
  expect(controller.read()).toMatchObject({ segment: "personal", search: "writer" });
  expect(controller.read().visible.map(({ title }) => title)).toEqual(["Writer"]);
});
