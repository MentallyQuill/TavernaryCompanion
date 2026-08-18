import { describe, expect, it } from "vitest";

import { DEFAULT_COMPANION_QUERY, SUPPORTED_CATALOG_SCHEMA } from "../../src/catalog/catalog-core";

describe("Companion CatalogCore adapter", () => {
  it("exposes schema 7 with removable SillyTavern discovery defaults", () => {
    expect(SUPPORTED_CATALOG_SCHEMA).toBe(7);
    expect(DEFAULT_COMPANION_QUERY).toMatchObject({
      frontends: ["sillytavern"],
      kinds: ["extension", "preset"],
    });
    expect(DEFAULT_COMPANION_QUERY.frontends).not.toBe(DEFAULT_COMPANION_QUERY.kits.frontends);
  });
});
