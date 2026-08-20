import { expect, it } from "vitest";
import {
  addDraftMember,
  addDraftMembers,
  createKitDraft,
  moveDraftMember,
  updateKitDraft,
} from "../../src/kits/kit-draft";
import type { PersonalKitV1 } from "../../src/kits/kit-types";

it("builds ordered personal Kit drafts and excludes Companion", () => {
  let draft = updateKitDraft(createKitDraft(), { title: "Writer" });
  draft = addDraftMember(draft, "alpha");
  draft = addDraftMember(draft, "beta");
  draft = addDraftMember(draft, "mentallyquill-tavernary-companion");
  draft = moveDraftMember(draft, "beta", -1);
  expect(draft.projectIds).toEqual(["beta", "alpha"]);
  expect(draft.issues).toEqual([]);
});

it("stages several selected extensions without reordering existing members", () => {
  const existing: PersonalKitV1 = {
    formatVersion: 1,
    id: "writer-kit",
    title: "Writer Kit",
    description: "",
    targetFrontend: "sillytavern",
    projectIds: ["alpha"],
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
    origin: { kind: "local" },
  };

  expect(
    addDraftMembers(createKitDraft(existing), [
      "beta",
      "alpha",
      "mentallyquill-tavernary-companion",
    ]).projectIds,
  ).toEqual(["alpha", "beta"]);
});
