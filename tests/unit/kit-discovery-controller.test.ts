import { expect, it } from "vitest";

import { createKitDiscoveryController } from "../../src/kits/kit-discovery-controller";
import {
  catalogFixture,
  catalogKitFixture,
  catalogProjectFixture,
} from "../helpers/catalog-fixtures";

it("segments published and personal Kits and searches local definitions", () => {
  const catalog = catalogFixture();
  catalog.projects = [
    catalogProjectFixture({ id: "alpha" }),
    catalogProjectFixture({ id: "beta" }),
    catalogProjectFixture({ id: "gamma" }),
  ];
  catalog.kits = [catalogKitFixture()];
  const controller = createKitDiscoveryController({
    catalog,
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
  expect(controller.read().segment).toBe("personal");
  expect(controller.read().visible.map(({ title }) => title)).toEqual(["Writer"]);
  expect(controller.read().facets).toEqual({
    frontends: [{ id: "sillytavern", label: "SillyTavern", count: 1 }],
    purposes: [{ id: "generation-reasoning", label: "Generation & Reasoning", count: 1 }],
    modelFamilies: [{ id: "claude", label: "Claude", count: 1 }],
    projects: [
      { id: "alpha", label: "alpha", count: 1 },
      { id: "beta", label: "beta", count: 1 },
      { id: "gamma", label: "gamma", count: 1 },
    ],
    availableCount: 1,
  });
  controller.setSearch("writer");
  expect(controller.read()).toMatchObject({ segment: "personal", search: "writer" });
  expect(controller.read().visible.map(({ title }) => title)).toEqual(["Writer"]);
});
