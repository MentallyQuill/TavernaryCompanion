import { expect, it } from "vitest";

import { createDefaultProfileState } from "../../src/state/profile-state";
import {
  migrateProfileState,
  UnsupportedProfileStateError,
} from "../../src/state/state-migrations";

it("creates the complete V1 profile default", () => {
  expect(createDefaultProfileState()).toEqual({
    formatVersion: 1,
    trustAcknowledgedAt: null,
    preferences: { route: "projects", density: "standard" },
    managedExtensions: {},
    personalKits: {},
    installedKits: {},
    activeKitId: null,
    operationReceipt: null,
    kitOperationJournal: null,
  });
});

it("repairs corrupt V1 fields independently and discards unknown keys", () => {
  const kit = {
    formatVersion: 1,
    id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
    title: "Writer's Kit",
    projectIds: ["example-beta", "example-alpha"],
  };

  expect(
    migrateProfileState({
      formatVersion: 1,
      trustAcknowledgedAt: "2026-08-18T12:00:00.000Z",
      preferences: { route: "kits", density: "oversized" },
      managedExtensions: [],
      personalKits: { [kit.id]: kit },
      installedKits: "corrupt",
      activeKitId: kit.id,
      operationReceipt: { operationId: "operation-1" },
      unknown: "discard me",
    }),
  ).toEqual({
    formatVersion: 1,
    trustAcknowledgedAt: "2026-08-18T12:00:00.000Z",
    preferences: { route: "kits", density: "standard" },
    managedExtensions: {},
    personalKits: { [kit.id]: kit },
    installedKits: {},
    activeKitId: kit.id,
    operationReceipt: { operationId: "operation-1" },
    kitOperationJournal: null,
  });
});

it("rejects a future positive profile format without altering it", () => {
  expect(() => migrateProfileState({ formatVersion: 2, personalKits: { keep: true } })).toThrow(
    UnsupportedProfileStateError,
  );
});
