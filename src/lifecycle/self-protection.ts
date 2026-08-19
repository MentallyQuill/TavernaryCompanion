export const COMPANION_PROJECT_ID = "mentallyquill-tavernary-companion" as const;

export type ProtectedLifecycleOperation = "install" | "remove" | "enable" | "disable" | "manage";

export class SelfProtectedProjectError extends Error {
  readonly operation: ProtectedLifecycleOperation;

  constructor(operation: ProtectedLifecycleOperation) {
    super(`Tavernary Companion cannot ${operation} itself.`);
    this.name = "SelfProtectedProjectError";
    this.operation = operation;
  }
}

export function assertNotCompanionProject(
  projectId: string,
  operation: ProtectedLifecycleOperation = "manage",
): void {
  if (projectId === COMPANION_PROJECT_ID) throw new SelfProtectedProjectError(operation);
}
