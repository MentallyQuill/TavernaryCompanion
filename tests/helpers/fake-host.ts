import type {
  HostExtension,
  HostExtensionAdapter,
  HostPopupOptions,
} from "../../src/host/host-types";

export interface FakeHostOptions {
  extensions?: HostExtension[];
  installResults?: Record<string, HostExtension>;
  failures?: Partial<Record<FakeHostOperation, Error>>;
}

export type FakeHostOperation =
  | "install"
  | "remove"
  | "enable"
  | "disable"
  | "openExtensionManager"
  | "openExternal"
  | "showPopup";

export class FakeHost implements HostExtensionAdapter {
  readonly #extensions: HostExtension[];
  readonly #installResults: Record<string, HostExtension>;
  readonly #failures: Partial<Record<FakeHostOperation, Error>>;
  readonly calls: Array<{ operation: string; [key: string]: unknown }> = [];
  reloadCount = 0;

  constructor(options: FakeHostOptions = {}) {
    this.#extensions = structuredClone(options.extensions ?? []);
    this.#installResults = structuredClone(options.installResults ?? {});
    this.#failures = { ...options.failures };
  }

  async discover(): Promise<HostExtension[]> {
    this.calls.push({ operation: "discover" });
    return structuredClone(this.#extensions);
  }

  async install(input: { repositoryUrl: string; branch: string | null }): Promise<void> {
    this.calls.push({ operation: "install", ...structuredClone(input) });
    this.#throwConfiguredFailure("install");
    const extension = this.#installResults[input.repositoryUrl];
    if (!extension) {
      throw new Error(`No fake install result for: ${input.repositoryUrl}`);
    }
    this.#extensions.push(structuredClone(extension));
  }

  async remove(input: { internalName: string; type: "local" | "global" }): Promise<void> {
    this.calls.push({ operation: "remove", ...structuredClone(input) });
    this.#throwConfiguredFailure("remove");
    const index = this.#extensions.findIndex(
      (candidate) => candidate.internalName === input.internalName && candidate.type === input.type,
    );
    if (index === -1) {
      throw new Error(`Unknown extension: ${input.internalName}`);
    }
    this.#extensions.splice(index, 1);
  }

  async enable(internalName: string): Promise<void> {
    this.calls.push({ operation: "enable", internalName });
    this.#throwConfiguredFailure("enable");
    const extension = this.#extensions.find((candidate) => candidate.internalName === internalName);
    if (!extension) {
      throw new Error(`Unknown extension: ${internalName}`);
    }
    extension.enabled = true;
  }

  async disable(internalName: string): Promise<void> {
    this.calls.push({ operation: "disable", internalName });
    this.#throwConfiguredFailure("disable");
    const extension = this.#extensions.find((candidate) => candidate.internalName === internalName);
    if (!extension) {
      throw new Error(`Unknown extension: ${internalName}`);
    }
    extension.enabled = false;
  }

  reload(): void {
    this.calls.push({ operation: "reload" });
    this.reloadCount += 1;
  }

  async openExtensionManager(): Promise<void> {
    this.calls.push({ operation: "openExtensionManager" });
    this.#throwConfiguredFailure("openExtensionManager");
  }

  openExternal(url: string): void {
    this.calls.push({ operation: "openExternal", url });
    this.#throwConfiguredFailure("openExternal");
  }

  async showPopup(content: HTMLElement, options: HostPopupOptions): Promise<void> {
    this.calls.push({ operation: "showPopup", content, options: structuredClone(options) });
    this.#throwConfiguredFailure("showPopup");
  }

  #throwConfiguredFailure(operation: FakeHostOperation): void {
    const failure = this.#failures[operation];
    if (failure) {
      throw failure;
    }
  }
}

export function createFakeHost(options: FakeHostOptions = {}): FakeHost {
  return new FakeHost(options);
}
