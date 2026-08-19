import { describe, expect, it } from "vitest";

import { verifyVendorLock } from "../../scripts/sync-tavernary-core.mjs";

describe("Tavernary CatalogCore vendor lock", () => {
  it("matches every vendored file to its lock hash", async () => {
    await expect(verifyVendorLock({ root: process.cwd() })).resolves.toEqual({ ok: true });
  });
});
