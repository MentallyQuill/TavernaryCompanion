import { expect, it } from "vitest";

import { ProfileStore } from "../../src/state/profile-store";
import { clearStoredReceipt } from "../../src/ui/popup-host";

it("clears only the persisted receipt that the user dismissed", async () => {
  const profile = new ProfileStore({
    extensionSettings: {},
    saveSettings: () => undefined,
  });
  await profile.update((draft) => {
    draft.operationReceipt = { id: "receipt-1", kind: "install" };
  });

  await clearStoredReceipt(profile, "another-receipt");
  expect(profile.read().operationReceipt).toMatchObject({ id: "receipt-1" });
  await clearStoredReceipt(profile, "receipt-1");
  expect(profile.read().operationReceipt).toBeNull();
});
