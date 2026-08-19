import { expect, it } from "vitest";

import { buildKitReferenceIndex } from "../../src/kits/kit-reference-index";

it("counts only installed Kit references", () => {
  const index = buildKitReferenceIndex([
    { kitId: "a", installedProjectIds: ["shared", "alpha"] },
    { kitId: "b", installedProjectIds: ["shared", "beta"] },
  ]);
  expect(index.get("shared")).toEqual(["a", "b"]);
  expect(index.get("alpha")).toEqual(["a"]);
});
