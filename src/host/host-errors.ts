export type HostOperation =
  | "discover"
  | "capabilities"
  | "resolveRevision"
  | "install"
  | "readRevision"
  | "inspectUpdate"
  | "update"
  | "remove"
  | "enable"
  | "disable";

export class HostOperationError extends Error {
  readonly operation: HostOperation;
  readonly status: number | null;
  readonly details: string | null;

  constructor(
    operation: HostOperation,
    message: string,
    options: { status?: number; details?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "HostOperationError";
    this.operation = operation;
    this.status = options.status ?? null;
    this.details = options.details ?? null;
  }
}

export class HostRevisionUnavailableError extends Error {
  readonly revision: string;

  constructor(revision: string, options: { cause?: unknown } = {}) {
    super("The selected extension commit is unavailable.", options);
    this.name = "HostRevisionUnavailableError";
    this.revision = revision;
  }
}
