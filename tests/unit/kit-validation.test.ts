import { describe, expect, it } from "vitest";

import { fingerprintKit, parsePersonalKit } from "../../src/kits/kit-validation";
import type { PersonalKitV1 } from "../../src/kits/kit-types";

const valid: PersonalKitV1 = {
  formatVersion: 1,
  id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
  title: "Writer's Kit",
  description: "Tools for long-form writing.",
  targetFrontend: "sillytavern",
  projectIds: ["sillytavern-sillytavern", "example-alpha", "example-beta"],
  createdAt: "2026-08-18T12:00:00.000Z",
  updatedAt: "2026-08-18T12:00:00.000Z",
  origin: { kind: "local" },
};

describe("personal Kit validation", () => {
  it("accepts a strict portable definition and preserves member order", () => {
    expect(parsePersonalKit(valid)).toEqual(valid);
  });

  it.each([
    ["duplicate projects", { ...valid, projectIds: ["example-alpha", "example-alpha"] }],
    ["Companion member", { ...valid, projectIds: ["mentallyquill-tavernary-companion"] }],
    ["empty title", { ...valid, title: "  " }],
    ["wrong frontend", { ...valid, targetFrontend: "agnai" }],
    ["invalid UUID", { ...valid, id: "writers-kit" }],
    ["invalid date", { ...valid, createdAt: "today" }],
    ["unknown machine field", { ...valid, localPath: "C:/private" }],
    ["unsupported version", { ...valid, formatVersion: 2 }],
  ])("rejects %s", (_label, candidate) => {
    expect(() => parsePersonalKit(candidate)).toThrow();
  });

  it("fingerprints topology without title or description", async () => {
    const first = await fingerprintKit(valid);
    const renamed = await fingerprintKit({ ...valid, title: "Renamed", description: "Changed" });
    const reordered = await fingerprintKit({
      ...valid,
      projectIds: [...valid.projectIds].reverse(),
    });
    expect(first).toBe(renamed);
    expect(first).not.toBe(reordered);
  });
});
