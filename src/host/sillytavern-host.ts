import { HostOperationError } from "./host-errors";
import type { HostExtension, HostExtensionAdapter, HostPopupOptions } from "./host-types";

export interface SillyTavernHostDependencies {
  getExtensionNames(): readonly string[];
  getExtensionTypes(): Readonly<Record<string, string>>;
  getDisabledExtensions(): readonly string[];
  getExtensionManifest(name: string): Record<string, unknown> | null;
  installExtension(url: string, global: boolean, branch: string): Promise<boolean>;
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

  constructor(dependencies: SillyTavernHostDependencies) {
    this.#dependencies = dependencies;
  }

  async discover(): Promise<HostExtension[]> {
    const types = this.#dependencies.getExtensionTypes();
    const disabled = new Set(this.#dependencies.getDisabledExtensions());

    return this.#dependencies
      .getExtensionNames()
      .filter((internalName) => types[internalName] === "local" || types[internalName] === "global")
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

  async install(input: { repositoryUrl: string; branch: string | null }): Promise<void> {
    const repositoryUrl = parseRepositoryUrl(input.repositoryUrl);
    const installed = await this.#dependencies.installExtension(
      repositoryUrl,
      false,
      input.branch ?? "",
    );
    if (!installed) {
      throw new HostOperationError("install", "SillyTavern could not install the extension.");
    }
    await this.discover();
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
}

function parseRepositoryUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch (cause) {
    throw new HostOperationError(
      "install",
      "Extension repositories require an HTTP or HTTPS URL.",
      {
        cause,
      },
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HostOperationError("install", "Extension repositories require an HTTP or HTTPS URL.");
  }

  return url.href;
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
