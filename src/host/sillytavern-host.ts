import { HostOperationError, HostRevisionUnavailableError } from "./host-errors";
import type {
  HostExtension,
  HostExtensionAdapter,
  HostInstallCapabilities,
  HostPopupOptions,
  HostResolvedRevision,
} from "./host-types";
import type { HostUpdateInspection, RevisionRelationship } from "../updates/update-types";

export interface SillyTavernHostDependencies {
  getExtensionNames(): readonly string[];
  getExtensionTypes(): Readonly<Record<string, string>>;
  getDisabledExtensions(): readonly string[];
  getExtensionManifest(name: string): Record<string, unknown> | null;
  /** A true result means SillyTavern refreshed extensionNames and extensionTypes. */
  installExtension(
    url: string,
    global: boolean,
    branch: string,
    commitSha?: string,
  ): Promise<boolean>;
  enableExtension(name: string, reload: boolean): Promise<void>;
  disableExtension(name: string, reload: boolean): Promise<void>;
  getRequestHeaders(): Record<string, string>;
  fetch: typeof fetch;
  reload(): void;
  openExtensionManager(): Promise<void>;
  openExternal(url: string): void;
  showPopup(content: HTMLElement, options: HostPopupOptions): Promise<void>;
}

export class SillyTavernHostAdapter implements HostExtensionAdapter {
  readonly #dependencies: SillyTavernHostDependencies;
  readonly #removedExtensions = new Set<string>();
  #installCapabilities: Promise<HostInstallCapabilities> | null = null;
  #updateInspectionSupported: boolean | null = null;
  #updateSupportProbe: Promise<HostUpdateInspection> | null = null;

  constructor(dependencies: SillyTavernHostDependencies) {
    this.#dependencies = dependencies;
  }

  async discover(): Promise<HostExtension[]> {
    const types = this.#dependencies.getExtensionTypes();
    const disabled = new Set(this.#dependencies.getDisabledExtensions());

    return this.#dependencies
      .getExtensionNames()
      .filter((internalName) => types[internalName] === "local" || types[internalName] === "global")
      .filter(
        (internalName) =>
          !this.#removedExtensions.has(
            extensionIdentity(internalName, types[internalName] as "local" | "global"),
          ),
      )
      .map((internalName) => {
        const manifest = this.#dependencies.getExtensionManifest(internalName);
        return {
          internalName,
          folderName: internalName.replace(/^third-party\//, ""),
          enabled: !disabled.has(internalName),
          type: types[internalName] as "local" | "global",
          manifest: manifest ? structuredClone(manifest) : null,
        };
      });
  }

  async getInstallCapabilities(): Promise<HostInstallCapabilities> {
    if (!this.#installCapabilities) {
      const request = this.#requestInstallCapabilities();
      const cached = request.catch((error: unknown) => {
        if (this.#installCapabilities === cached) this.#installCapabilities = null;
        throw error;
      });
      this.#installCapabilities = cached;
    }
    return structuredClone(await this.#installCapabilities);
  }

  async readExtensionRepositoryUrl(input: {
    internalName: string;
    type: "local" | "global";
  }): Promise<string | null> {
    let response: Response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/version", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global",
        }),
      });
    } catch (cause) {
      throw new HostOperationError(
        "discover",
        "SillyTavern could not read the installed extension repository.",
        { cause },
      );
    }
    if (!response.ok) {
      throw await responseError(
        "discover",
        "SillyTavern could not read the installed extension repository.",
        response,
      );
    }
    const body = await readJsonObject(response, "discover");
    if (body.remoteUrl === "" || body.remoteUrl === null) return null;
    if (typeof body.remoteUrl !== "string") {
      throw new HostOperationError(
        "discover",
        "SillyTavern returned invalid installed extension repository evidence.",
      );
    }
    return parseRepositoryUrl(body.remoteUrl, "discover");
  }

  async #requestInstallCapabilities(): Promise<HostInstallCapabilities> {
    let response: Response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/capabilities", {
        method: "GET",
        headers: this.#dependencies.getRequestHeaders(),
      });
    } catch (cause) {
      throw new HostOperationError(
        "capabilities",
        "SillyTavern could not reach the extension service.",
        { cause },
      );
    }

    if (response.status === 404) return legacyInstallCapabilities();
    if (!response.ok) {
      throw await responseError(
        "capabilities",
        "SillyTavern could not report extension install capabilities.",
        response,
      );
    }

    const body = await readJsonObject(response, "capabilities");
    const capabilities = {
      pinnedCommitInstall: body.pinnedCommitInstall,
      remoteRevisionLookup: body.remoteRevisionLookup,
      localRevisionLookup: body.localRevisionLookup,
    };
    if (!Object.values(capabilities).every((value) => typeof value === "boolean")) {
      throw new HostOperationError(
        "capabilities",
        "SillyTavern returned invalid extension install capabilities.",
      );
    }
    return capabilities as HostInstallCapabilities;
  }

  async resolveRemoteRevision(input: {
    repositoryUrl: string;
    branch: string | null;
  }): Promise<HostResolvedRevision> {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl, "resolveRevision");
    let response: Response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/resolve", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({ repositoryUrl, branch: input.branch }),
      });
    } catch (cause) {
      throw new HostOperationError(
        "resolveRevision",
        "SillyTavern could not reach the extension service.",
        { cause },
      );
    }
    if (!response.ok) {
      throw await responseError(
        "resolveRevision",
        "SillyTavern could not resolve the extension revision.",
        response,
      );
    }
    const body = await readJsonObject(response, "resolveRevision");
    return { sha: parseCommitSha(body.sha, "resolveRevision") };
  }

  async install(input: {
    repositoryUrl: string;
    branch: string | null;
    commitSha?: string | null;
  }): Promise<void> {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl, "install");
    const commitSha =
      input.commitSha !== null && input.commitSha !== undefined
        ? parseCommitSha(input.commitSha, "install")
        : undefined;
    if (commitSha) {
      const capabilities = await this.getInstallCapabilities();
      if (!capabilities.pinnedCommitInstall) {
        throw new HostOperationError(
          "install",
          "SillyTavern does not advertise pinned commit installs.",
        );
      }
    }

    let installed: boolean;
    try {
      installed = await this.#dependencies.installExtension(
        repositoryUrl,
        false,
        input.branch ?? "",
        commitSha,
      );
    } catch (cause) {
      if (commitSha && isExplicitUnavailableCommitError(cause)) {
        throw new HostRevisionUnavailableError(commitSha, { cause });
      }
      throw cause;
    }
    if (!installed) {
      throw new HostOperationError("install", "SillyTavern could not install the extension.");
    }
    await this.#reconcileRemovedExtensions();
    await this.discover();
  }

  async readLocalRevision(input: {
    internalName: string;
    type: "local" | "global";
  }): Promise<string | null> {
    let response: Response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/version", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global",
        }),
      });
    } catch (cause) {
      throw new HostOperationError(
        "readRevision",
        "SillyTavern could not reach the extension service.",
        { cause },
      );
    }
    if (!response.ok) {
      throw await responseError(
        "readRevision",
        "SillyTavern could not read the installed extension revision.",
        response,
      );
    }
    const body = await readJsonObject(response, "readRevision");
    if (body.currentCommitHash === "" || body.currentCommitHash === null) return null;
    return parseCommitSha(body.currentCommitHash, "readRevision");
  }

  async inspectUpdate(input: {
    internalName: string;
    type: "local" | "global";
    repositoryUrl: string;
    branch: string | null;
    candidateShas: string[];
  }): Promise<HostUpdateInspection> {
    if (this.#updateInspectionSupported === false)
      return this.#requestNativeUpdateInspection(input);
    if (this.#updateInspectionSupported === true) {
      return this.#requestUpdateInspection(input);
    }
    if (this.#updateSupportProbe) {
      await this.#updateSupportProbe;
      if (this.#updateInspectionSupported === false)
        return this.#requestNativeUpdateInspection(input);
      return this.#requestUpdateInspection(input);
    }

    const probe = this.#requestUpdateInspection(input).then(
      (inspection) => {
        this.#updateInspectionSupported = true;
        return inspection;
      },
      async (error: unknown) => {
        if (isUnsupportedUpdateInspectionError(error)) {
          this.#updateInspectionSupported = false;
          return this.#requestNativeUpdateInspection(input);
        }
        throw error;
      },
    );
    this.#updateSupportProbe = probe;
    try {
      return await probe;
    } finally {
      if (this.#updateSupportProbe === probe) this.#updateSupportProbe = null;
    }
  }

  async #requestNativeUpdateInspection(input: {
    internalName: string;
    type: "local" | "global";
    repositoryUrl: string;
    branch: string | null;
  }): Promise<HostUpdateInspection> {
    let response: Response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/version", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global",
        }),
      });
    } catch (cause) {
      throw new HostOperationError(
        "inspectUpdate",
        "SillyTavern could not reach the native extension update service.",
        { cause },
      );
    }
    if (!response.ok) {
      throw await responseError(
        "inspectUpdate",
        "SillyTavern could not check this extension for updates.",
        response,
      );
    }
    const body = await readJsonObject(response, "inspectUpdate");
    if (
      typeof body.currentBranchName !== "string" ||
      typeof body.isUpToDate !== "boolean" ||
      typeof body.remoteUrl !== "string"
    ) {
      throw new HostOperationError(
        "inspectUpdate",
        "SillyTavern returned invalid native extension update evidence.",
      );
    }
    return {
      installedSha: parseCommitSha(body.currentCommitHash, "inspectUpdate"),
      newestSha: null,
      remoteUrl: body.remoteUrl,
      branch: body.currentBranchName,
      worktreeClean: null,
      branchMatches: input.branch === null || input.branch === body.currentBranchName,
      exactUpdateSupported: false,
      newestRelationship: body.isUpToDate ? "equal" : "behind",
      candidateRelationships: {},
    };
  }

  async #requestUpdateInspection(input: {
    internalName: string;
    type: "local" | "global";
    repositoryUrl: string;
    branch: string | null;
    candidateShas: string[];
  }): Promise<HostUpdateInspection> {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl, "inspectUpdate");
    const candidateShas = input.candidateShas.map((sha) => parseCommitSha(sha, "inspectUpdate"));
    let response: Response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/update-status", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global",
          repositoryUrl,
          branch: input.branch,
          candidateShas,
        }),
      });
    } catch (cause) {
      throw new HostOperationError(
        "inspectUpdate",
        "SillyTavern could not reach the extension update service.",
        { cause },
      );
    }
    if (response.status === 404) {
      throw unsupportedUpdateInspectionError();
    }
    if (!response.ok) {
      throw await responseError(
        "inspectUpdate",
        "SillyTavern could not check extension updates.",
        response,
      );
    }
    const body = await readJsonObject(response, "inspectUpdate");
    const relationships = parseCandidateRelationships(body.candidateRelationships);
    if (
      typeof body.remoteUrl !== "string" ||
      typeof body.branch !== "string" ||
      typeof body.worktreeClean !== "boolean" ||
      typeof body.branchMatches !== "boolean" ||
      typeof body.exactUpdateSupported !== "boolean"
    ) {
      throw new HostOperationError(
        "inspectUpdate",
        "SillyTavern returned invalid extension update evidence.",
      );
    }
    return {
      installedSha: parseCommitSha(body.installedSha, "inspectUpdate"),
      newestSha: parseCommitSha(body.newestSha, "inspectUpdate"),
      remoteUrl: body.remoteUrl,
      branch: body.branch,
      worktreeClean: body.worktreeClean,
      branchMatches: body.branchMatches,
      exactUpdateSupported: body.exactUpdateSupported,
      newestRelationship: parseRevisionRelationship(body.newestRelationship),
      candidateRelationships: relationships,
    };
  }

  async applyUpdate(input: {
    internalName: string;
    type: "local" | "global";
    repositoryUrl: string;
    branch: string | null;
    expectedCurrentSha: string;
    targetSha: string | null;
  }): Promise<void> {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl, "update");
    const expectedCurrentSha = parseCommitSha(input.expectedCurrentSha, "update");
    const targetSha = input.targetSha === null ? null : parseCommitSha(input.targetSha, "update");
    let response: Response;
    try {
      response = targetSha
        ? await this.#dependencies.fetch("/api/extensions/update-to", {
            method: "POST",
            headers: this.#dependencies.getRequestHeaders(),
            body: JSON.stringify({
              extensionName: input.internalName.replace(/^third-party\//, ""),
              global: input.type === "global",
              repositoryUrl,
              branch: input.branch,
              expectedCurrentSha,
              targetSha,
            }),
          })
        : await this.#dependencies.fetch("/api/extensions/update", {
            method: "POST",
            headers: this.#dependencies.getRequestHeaders(),
            body: JSON.stringify({
              extensionName: input.internalName.replace(/^third-party\//, ""),
              global: input.type === "global",
            }),
          });
    } catch (cause) {
      throw new HostOperationError(
        "update",
        "SillyTavern could not reach the extension update service.",
        { cause },
      );
    }
    if (!response.ok) {
      throw await responseError("update", "SillyTavern could not update the extension.", response);
    }
  }

  async remove(input: { internalName: string; type: "local" | "global" }): Promise<void> {
    let response: Response;
    try {
      response = await this.#dependencies.fetch("/api/extensions/delete", {
        method: "POST",
        headers: this.#dependencies.getRequestHeaders(),
        body: JSON.stringify({
          extensionName: input.internalName.replace(/^third-party\//, ""),
          global: input.type === "global",
        }),
      });
    } catch {
      throw new HostOperationError("remove", "SillyTavern could not reach the extension service.");
    }

    if (!response.ok) {
      const details = sanitizeResponseDetails(await response.text());
      throw new HostOperationError("remove", "SillyTavern could not remove the extension.", {
        status: response.status,
        details,
      });
    }

    this.#removedExtensions.add(extensionIdentity(input.internalName, input.type));
    await this.discover();
  }

  async enable(internalName: string): Promise<void> {
    await this.#dependencies.enableExtension(internalName, false);
    await this.discover();
  }

  async disable(internalName: string): Promise<void> {
    await this.#dependencies.disableExtension(internalName, false);
    await this.discover();
  }

  reload(): void {
    this.#dependencies.reload();
  }

  async openExtensionManager(): Promise<void> {
    await this.#dependencies.openExtensionManager();
  }

  openExternal(url: string): void {
    this.#dependencies.openExternal(url);
  }

  async showPopup(content: HTMLElement, options: HostPopupOptions): Promise<void> {
    await this.#dependencies.showPopup(content, options);
  }

  async #reconcileRemovedExtensions(): Promise<void> {
    if (this.#removedExtensions.size === 0) return;
    let records: unknown = null;
    try {
      const response = await this.#dependencies.fetch("/api/extensions/discover", {
        method: "GET",
        headers: this.#dependencies.getRequestHeaders(),
      });
      if (response.ok) records = await response.json();
    } catch {
      // Fall back to the module inventory refreshed by installExtension.
    }
    if (Array.isArray(records)) {
      for (const record of records) {
        if (!record || typeof record !== "object") continue;
        const { name, type } = record as { name?: unknown; type?: unknown };
        if (typeof name === "string" && (type === "local" || type === "global")) {
          this.#removedExtensions.delete(extensionIdentity(name, type));
        }
      }
      return;
    }
    const types = this.#dependencies.getExtensionTypes();
    for (const internalName of this.#dependencies.getExtensionNames()) {
      const type = types[internalName];
      if (type === "local" || type === "global") {
        this.#removedExtensions.delete(extensionIdentity(internalName, type));
      }
    }
  }
}

function unsupportedUpdateInspectionError(): HostOperationError {
  return new HostOperationError(
    "inspectUpdate",
    "This version of SillyTavern cannot check updates safely.",
    { status: 404 },
  );
}

function isUnsupportedUpdateInspectionError(error: unknown): boolean {
  return (
    error instanceof HostOperationError &&
    error.operation === "inspectUpdate" &&
    error.status === 404
  );
}

function extensionIdentity(internalName: string, type: "local" | "global"): string {
  return `${type}:${internalName}`;
}

function legacyInstallCapabilities(): HostInstallCapabilities {
  return {
    pinnedCommitInstall: false,
    remoteRevisionLookup: false,
    localRevisionLookup: true,
  };
}

async function responseError(
  operation:
    "discover" | "capabilities" | "resolveRevision" | "readRevision" | "inspectUpdate" | "update",
  message: string,
  response: Response,
): Promise<HostOperationError> {
  return new HostOperationError(operation, message, {
    status: response.status,
    details: sanitizeResponseDetails(await response.text()),
  });
}

async function readJsonObject(
  response: Response,
  operation: "discover" | "capabilities" | "resolveRevision" | "readRevision" | "inspectUpdate",
): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // Fall through to the sanitized host contract error below.
  }
  throw new HostOperationError(operation, "SillyTavern returned an invalid extension response.");
}

function parseCommitSha(
  value: unknown,
  operation: "resolveRevision" | "install" | "readRevision" | "inspectUpdate" | "update",
): string {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/i.test(value)) {
    throw new HostOperationError(operation, "SillyTavern did not return a valid commit SHA.");
  }
  return value.toLowerCase();
}

function isExplicitUnavailableCommitError(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === "COMMIT_UNAVAILABLE"
  );
}

function parseRepositoryUrl(
  input: string,
  operation: "discover" | "resolveRevision" | "install" | "inspectUpdate" | "update",
): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch (cause) {
    throw new HostOperationError(
      operation,
      "Extension repositories require an HTTP or HTTPS URL.",
      {
        cause,
      },
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HostOperationError(operation, "Extension repositories require an HTTP or HTTPS URL.");
  }

  return url.href;
}

function parseRevisionRelationship(value: unknown): RevisionRelationship {
  if (value === "equal" || value === "behind" || value === "ahead" || value === "diverged") {
    return value;
  }
  throw new HostOperationError(
    "inspectUpdate",
    "SillyTavern returned invalid extension update evidence.",
  );
}

function parseCandidateRelationships(value: unknown): Record<string, RevisionRelationship> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HostOperationError(
      "inspectUpdate",
      "SillyTavern returned invalid extension update evidence.",
    );
  }
  return Object.fromEntries(
    Object.entries(value).map(([sha, relationship]) => [
      parseCommitSha(sha, "inspectUpdate"),
      parseRevisionRelationship(relationship),
    ]),
  );
}

export function sanitizeResponseDetails(input: string): string {
  return Array.from(input)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && (codePoint < 127 || codePoint > 159);
    })
    .join("")
    .trim()
    .slice(0, 500);
}
