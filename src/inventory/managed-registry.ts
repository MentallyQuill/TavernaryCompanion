import type { HostExtension } from "../host/host-types";
import { assertNotCompanionProject, COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import type {
  ManagedExtensionMap,
  ManagedExtensionRecord,
  ManagedInstallOrigin,
} from "./inventory-types";

export { COMPANION_PROJECT_ID } from "../lifecycle/self-protection";

function folderIdentity(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

export class ManagedRegistry {
  #records: ManagedExtensionMap;

  constructor(initial: ManagedExtensionMap = {}) {
    this.#records = structuredClone(initial);
    delete this.#records[COMPANION_PROJECT_ID];
  }

  read(): ManagedExtensionMap {
    return structuredClone(this.#records);
  }

  recordInstalled({
    projectId,
    expectedFolderName,
    extension,
    installedAt,
    installedBy,
  }: {
    projectId: string;
    expectedFolderName: string;
    extension: HostExtension;
    installedAt: string;
    installedBy: ManagedInstallOrigin;
  }): ManagedExtensionRecord {
    assertNotCompanionProject(projectId);
    if (folderIdentity(extension.folderName) !== folderIdentity(expectedFolderName)) {
      throw new Error("Installed extension does not match the rediscovered folder.");
    }
    const record: ManagedExtensionRecord = {
      projectId,
      internalName: extension.internalName,
      folderName: extension.folderName,
      installedAt,
      installedBy,
    };
    this.#records[projectId] = structuredClone(record);
    return structuredClone(record);
  }

  remove(projectId: string): boolean {
    if (!(projectId in this.#records)) return false;
    delete this.#records[projectId];
    return true;
  }

  pruneAbsent(hostExtensions: readonly HostExtension[]): string[] {
    const removed: string[] = [];
    for (const [projectId, record] of Object.entries(this.#records)) {
      const present = hostExtensions.some(
        (extension) =>
          extension.internalName === record.internalName &&
          folderIdentity(extension.folderName) === folderIdentity(record.folderName),
      );
      if (!present) {
        delete this.#records[projectId];
        removed.push(projectId);
      }
    }
    return removed.sort();
  }
}
