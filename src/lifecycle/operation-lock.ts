export interface ActiveOperation {
  operationId: string;
  phase: string;
}

export class OperationInProgressError extends Error {
  readonly active: ActiveOperation;

  constructor(active: ActiveOperation) {
    super(`Lifecycle operation ${active.operationId} is already in progress.`);
    this.name = "OperationInProgressError";
    this.active = structuredClone(active);
  }
}

export class OperationLock {
  readonly #subscribers = new Set<(active: ActiveOperation | null) => void>();
  #active: ActiveOperation | null = null;

  read(): ActiveOperation | null {
    return this.#active ? structuredClone(this.#active) : null;
  }

  subscribe(subscriber: (active: ActiveOperation | null) => void): () => void {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }

  async runExclusive<T>(
    operationId: string,
    callback: (context: { setPhase(phase: string): void }) => Promise<T>,
  ): Promise<T> {
    if (this.#active) throw new OperationInProgressError(this.#active);
    this.#active = { operationId, phase: "preflight" };
    this.#notify();
    try {
      return await callback({
        setPhase: (phase) => {
          if (!this.#active || this.#active.operationId !== operationId) return;
          this.#active = { operationId, phase };
          this.#notify();
        },
      });
    } finally {
      this.#active = null;
      this.#notify();
    }
  }

  #notify(): void {
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
}
