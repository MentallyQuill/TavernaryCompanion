export type HostOperation = "discover" | "install" | "remove" | "enable" | "disable";

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
