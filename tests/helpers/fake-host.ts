import type {
  HostExtension,
  HostExtensionAdapter,
  HostInstallCapabilities,
  HostPopupOptions,
} from "../../src/host/host-types";
import { HostOperationError, HostRevisionUnavailableError } from "../../src/host/host-errors";

export interface FakeHostOptions {
  extensions?: HostExtension[];
  installResults?: Record<string, HostExtension>;
  capabilities?: HostInstallCapabilities;
  remoteHeads?: Record<string, string>;
  installedRevisions?: Record<string, string | null>;
  unavailableHashes?: string[];
  mismatchResults?: Record<string, string>;
  failures?: Partial<Record<FakeHostOperation, Error>>;
}

export type FakeHostOperation =
  | "getInstallCapabilities"
  | "resolveRemoteRevision"
  | "install"
  | "readLocalRevision"
  | "remove"
  | "enable"
  | "disable"
  | "openExtensionManager"
  | "openExternal"
  | "showPopup";

export class FakeHost implements HostExtensionAdapter {
  readonly #extensions: HostExtension[];
  readonly #installResults: Record<string, HostExtension>;
  readonly #capabilities: HostInstallCapabilities;
  readonly #remoteHeads: Record<string, string>;
  readonly #installedRevisions: Record<string, string | null>;
  readonly #unavailableHashes: Set<string>;
  readonly #mismatchResults: Record<string, string>;
  readonly #failures: Partial<Record<FakeHostOperation, Error>>;
  readonly calls: Array<{ operation: string; [key: string]: unknown }> = [];
  reloadCount = 0;

  constructor(options: FakeHostOptions = {}) {
    this.#extensions = structuredClone(options.extensions ?? []);
    this.#installResults = structuredClone(options.installResults ?? {});
    this.#capabilities = structuredClone(
      options.capabilities ?? {
        pinnedCommitInstall: false,
        remoteRevisionLookup: false,
        localRevisionLookup: true,
      },
    );
    this.#remoteHeads = structuredClone(options.remoteHeads ?? {});
    this.#installedRevisions = structuredClone(options.installedRevisions ?? {});
    this.#unavailableHashes = new Set(options.unavailableHashes ?? []);
    this.#mismatchResults = structuredClone(options.mismatchResults ?? {});
    this.#failures = { ...options.failures };
  }

  async discover(): Promise<HostExtension[]> {
    this.calls.push({ operation: "discover" });
    return structuredClone(this.#extensions);
  }

  async getInstallCapabilities(): Promise<HostInstallCapabilities> {
    this.calls.push({ operation: "getInstallCapabilities" });
    this.#throwConfiguredFailure("getInstallCapabilities");
    return structuredClone(this.#capabilities);
  }

  async resolveRemoteRevision(input: {
    repositoryUrl: string;
    branch: string | null;
  }): Promise<{ sha: string }> {
    this.calls.push({ operation: "resolveRemoteRevision", ...structuredClone(input) });
    this.#throwConfiguredFailure("resolveRemoteRevision");
    if (!this.#capabilities.remoteRevisionLookup) {
      throw new HostOperationError("resolveRevision", "Remote revision lookup is unavailable.");
    }
    const key = `${input.repositoryUrl}#${input.branch ?? ""}`;
    const sha = this.#remoteHeads[key];
    if (!sha) throw new Error(`No fake remote head for: ${key}`);
    return { sha };
  }

  async install(input: {
    repositoryUrl: string;
    branch: string | null;
    commitSha?: string | null;
  }): Promise<void> {
    this.calls.push({ operation: "install", ...structuredClone(input) });
    this.#throwConfiguredFailure("install");
    if (input.commitSha && !this.#capabilities.pinnedCommitInstall) {
      throw new HostOperationError("install", "Pinned commit installs are unavailable.");
    }
    if (input.commitSha && this.#unavailableHashes.has(input.commitSha)) {
      throw new HostRevisionUnavailableError(input.commitSha);
    }
    const extension = this.#installResults[input.repositoryUrl];
    if (!extension) {
      throw new Error(`No fake install result for: ${input.repositoryUrl}`);
    }
    this.#extensions.push(structuredClone(extension));
    const observedRevision = input.commitSha
      ? (this.#mismatchResults[input.commitSha] ?? input.commitSha)
      : (this.#remoteHeads[`${input.repositoryUrl}#${input.branch ?? ""}`] ?? null);
    this.#installedRevisions[`${extension.type}:${extension.internalName}`] = observedRevision;
  }

  async readLocalRevision(input: {
    internalName: string;
    type: "local" | "global";
  }): Promise<string | null> {
    this.calls.push({ operation: "readLocalRevision", ...structuredClone(input) });
    this.#throwConfiguredFailure("readLocalRevision");
    if (!this.#capabilities.localRevisionLookup) {
      throw new HostOperationError("readRevision", "Local revision lookup is unavailable.");
    }
    return this.#installedRevisions[`${input.type}:${input.internalName}`] ?? null;
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
    delete this.#installedRevisions[`${input.type}:${input.internalName}`];
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
