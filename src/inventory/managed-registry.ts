import type { HostExtension } from "../host/host-types";
import { assertNotCompanionProject, COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import {
  legacyInstallProvenance,
  type ManagedInstallProvenance,
} from "../lifecycle/install-target";
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
    provenance,
  }: {
    projectId: string;
    expectedFolderName: string;
    extension: HostExtension;
    installedAt: string;
    installedBy: ManagedInstallOrigin;
    provenance: ManagedInstallProvenance;
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
      provenance: structuredClone(provenance),
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

export function normalizeManagedExtensionMap(value: Record<string, unknown>): ManagedExtensionMap {
  const result: ManagedExtensionMap = {};
  for (const [projectId, candidate] of Object.entries(value)) {
    if (!isManagedRecord(candidate) || candidate.projectId !== projectId) continue;
    result[projectId] = {
      ...structuredClone(candidate),
      provenance: hasOwn(candidate, "provenance")
        ? structuredClone(candidate.provenance)
        : legacyInstallProvenance(),
    };
  }
  delete result[COMPANION_PROJECT_ID];
  return result;
}

function isManagedRecord(value: unknown): value is ManagedExtensionRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Partial<ManagedExtensionRecord>;
  return (
    typeof record.projectId === "string" &&
    typeof record.internalName === "string" &&
    typeof record.folderName === "string" &&
    typeof record.installedAt === "string" &&
    (record.installedBy === "individual" || record.installedBy === "kit") &&
    (!hasOwn(record, "provenance") || isManagedInstallProvenance(record.provenance))
  );
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isManagedInstallProvenance(value: unknown): value is ManagedInstallProvenance {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const provenance = value as Partial<ManagedInstallProvenance>;
  if (provenance.targetKind === "legacy-unknown") {
    return (
      provenance.requestedSha === null &&
      provenance.installedSha === null &&
      provenance.catalogGeneratedAt === null &&
      provenance.tavernKeeperReportId === null
    );
  }
  return (
    (provenance.targetKind === "checked" || provenance.targetKind === "newest") &&
    (typeof provenance.requestedSha === "string" || provenance.requestedSha === null) &&
    (typeof provenance.installedSha === "string" || provenance.installedSha === null) &&
    typeof provenance.catalogGeneratedAt === "string" &&
    (typeof provenance.tavernKeeperReportId === "string" ||
      provenance.tavernKeeperReportId === null)
  );
}
