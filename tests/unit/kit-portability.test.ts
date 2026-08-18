import { expect, it } from "vitest";
import {
  parseKitBytes,
  parseKitText,
  prepareImportedKit,
  serializeKit,
} from "../../src/kits/kit-portability";
import type { PersonalKitV1 } from "../../src/kits/kit-types";

const kit: PersonalKitV1 = {
  formatVersion: 1,
  id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
  title: "Writer's Kit",
  description: "Tools",
  targetFrontend: "sillytavern",
  projectIds: ["alpha", "beta"],
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  origin: { kind: "local" },
};
it("round-trips deterministic portable JSON with no machine state", () => {
  const exported = serializeKit(kit);
  expect(exported.filename).toBe("writer-s-kit.tavernary-kit.json");
  expect(parseKitText(exported.text)).toEqual(kit);
  expect(exported.text).not.toMatch(/installed|activeKit|receipt|token/iu);
});
it("rejects invalid UTF-8 and creates a safe identity on collision", () => {
  expect(() => parseKitBytes(new Uint8Array([0xff]))).toThrow("UTF-8");
  const imported = prepareImportedKit(
    kit,
    new Set([kit.id]),
    () => "018f6f42-7142-7a1f-9b52-9d3a7d548121",
    () => "2026-08-18T01:00:00.000Z",
  );
  expect(imported).toMatchObject({
    id: "018f6f42-7142-7a1f-9b52-9d3a7d548121",
    origin: { kind: "imported", sourceId: kit.id },
  });
});
