import type { CatalogProject } from "../catalog/catalog-core";
import type { TrustPrompt } from "../trust/trust-types";

export interface PendingTrustPrompt {
  prompt: TrustPrompt;
  project: CatalogProject;
}

export class TrustPromptBroker {
  readonly #subscribers = new Set<(pending: PendingTrustPrompt | null) => void>();
  #pending: PendingTrustPrompt | null = null;
  #resolve: ((approved: boolean) => void) | null = null;

  read(): PendingTrustPrompt | null {
    return this.#pending ? structuredClone(this.#pending) : null;
  }

  subscribe(subscriber: (pending: PendingTrustPrompt | null) => void): () => void {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }

  request(prompt: TrustPrompt, project: CatalogProject): Promise<boolean> {
    if (this.#pending) throw new Error("A trust prompt is already pending.");
    this.#pending = { prompt: structuredClone(prompt), project: structuredClone(project) };
    this.#notify();
    return new Promise<boolean>((resolve) => {
      this.#resolve = resolve;
    });
  }

  respond(approved: boolean): void {
    const resolve = this.#resolve;
    if (!resolve) return;
    this.#pending = null;
    this.#resolve = null;
    this.#notify();
    resolve(approved);
  }

  cancel(): void {
    this.respond(false);
  }

  #notify(): void {
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
}
