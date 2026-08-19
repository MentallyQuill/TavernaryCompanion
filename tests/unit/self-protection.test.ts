import { expect, it } from "vitest";

import {
  assertNotCompanionProject,
  COMPANION_PROJECT_ID,
  SelfProtectedProjectError,
} from "../../src/lifecycle/self-protection";

it("fails closed for every direct Companion lifecycle entry point", () => {
  for (const operation of ["install", "remove", "enable", "disable"] as const) {
    expect(() => assertNotCompanionProject(COMPANION_PROJECT_ID, operation)).toThrow(
      SelfProtectedProjectError,
    );
  }
  expect(() => assertNotCompanionProject("alpha", "install")).not.toThrow();
});
