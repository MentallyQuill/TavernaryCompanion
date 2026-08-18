import { expect, it } from "vitest";
import {
  addDraftMember,
  createKitDraft,
  moveDraftMember,
  updateKitDraft,
} from "../../src/kits/kit-draft";

it("builds ordered personal Kit drafts and excludes Companion", () => {
  let draft = updateKitDraft(createKitDraft(), { title: "Writer" });
  draft = addDraftMember(draft, "alpha");
  draft = addDraftMember(draft, "beta");
  draft = addDraftMember(draft, "mentallyquill-tavernary-companion");
  draft = moveDraftMember(draft, "beta", -1);
  expect(draft.projectIds).toEqual(["beta", "alpha"]);
  expect(draft.issues).toEqual([]);
});
