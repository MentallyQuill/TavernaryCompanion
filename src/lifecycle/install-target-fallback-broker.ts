import type { InstallTarget } from "./install-target";
import type { PreparedInstallSelection } from "./lifecycle-coordinator";

export const CHECKED_VERSION_UNAVAILABLE_REASON =
  "That scanned version isn't available anymore. You can choose Latest from creator or cancel.";

type CheckedSelection = PreparedInstallSelection<Extract<InstallTarget, { kind: "checked" }>>;
type NewestSelection = PreparedInstallSelection<Extract<InstallTarget, { kind: "newest" }>>;

export interface InstallTargetFallbackRequest {
  projectId: string;
  projectName: string;
  checked: CheckedSelection;
  newest: NewestSelection;
}

type Listener = (request: InstallTargetFallbackRequest | null) => void;

export class InstallTargetFallbackBroker {
  readonly #listeners = new Set<Listener>();
  #pending: {
    request: InstallTargetFallbackRequest;
    resolve(selection: PreparedInstallSelection | null): void;
  } | null = null;

  read(): InstallTargetFallbackRequest | null {
    return this.#pending?.request ?? null;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    listener(this.read());
    return () => this.#listeners.delete(listener);
  }

  request(request: InstallTargetFallbackRequest): Promise<PreparedInstallSelection | null> {
    if (this.#pending) throw new Error("Another install version choice is already waiting.");
    return new Promise((resolve) => {
      this.#pending = { request, resolve };
      this.#emit();
    });
  }

  respond(selection: PreparedInstallSelection): boolean {
    return this.#settle(selection);
  }

  cancel(): boolean {
    return this.#settle(null);
  }

  #settle(selection: PreparedInstallSelection | null): boolean {
    const pending = this.#pending;
    if (!pending) return false;
    this.#pending = null;
    pending.resolve(selection);
    this.#emit();
    return true;
  }

  #emit(): void {
    const request = this.read();
    for (const listener of this.#listeners) listener(request);
  }
}
