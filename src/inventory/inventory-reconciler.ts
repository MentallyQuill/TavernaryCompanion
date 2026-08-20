import type { CatalogProject } from "../catalog/catalog-core";
import type { HostExtension, HostExtensionAdapter } from "../host/host-types";
import type { ManagedInstallProvenance } from "../lifecycle/install-target";
import type { ProfileStore } from "../state/profile-store";
import {
  COMPANION_PROJECT_ID,
  ManagedRegistry,
  normalizeManagedExtensionMap,
} from "./managed-registry";
import type {
  InventorySnapshot,
  ManagedExtensionMap,
  ManagedExtensionRecord,
} from "./inventory-types";
import { sameRepositoryUrl } from "../updates/update-targets";

function folderIdentity(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

export function reconcileInventory({
  projects,
  hostExtensions,
  managed,
}: {
  projects: readonly CatalogProject[];
  hostExtensions: readonly HostExtension[];
  managed: ManagedExtensionMap;
}): InventorySnapshot {
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const projectsByFolder = new Map<string, CatalogProject[]>();
  for (const project of projects) {
    if (
      !project.install ||
      project.kind !== "extension" ||
      !project.frontends.some(({ id }) => id === "sillytavern")
    ) {
      continue;
    }
    const identity = folderIdentity(project.install.folderName);
    const matches = projectsByFolder.get(identity) ?? [];
    matches.push(project);
    projectsByFolder.set(identity, matches);
  }

  const snapshot: InventorySnapshot = {
    managed: [],
    external: [],
    unknown: [],
    missingManaged: [],
  };
  const representedManagedIds = new Set<string>();

  for (const extension of hostExtensions) {
    let matches = projectsByFolder.get(folderIdentity(extension.folderName)) ?? [];
    const repositoryUrl = extension.repositoryUrl;
    if (matches.length > 1 && repositoryUrl) {
      const repositoryMatches = matches.filter(
        (project) =>
          project.install && sameRepositoryUrl(project.install.repositoryUrl, repositoryUrl),
      );
      if (repositoryMatches.length === 1) matches = repositoryMatches;
    }
    if (matches.length !== 1) {
      snapshot.unknown.push({
        extension: structuredClone(extension),
        reason: matches.length > 1 ? "ambiguous-folder" : "folder-not-in-catalog",
      });
      continue;
    }
    const project = matches[0];
    const record = managed[project.id];
    if (
      project.id !== COMPANION_PROJECT_ID &&
      record &&
      record.projectId === project.id &&
      record.internalName === extension.internalName &&
      folderIdentity(record.folderName) === folderIdentity(extension.folderName)
    ) {
      snapshot.managed.push({
        project,
        extension: structuredClone(extension),
        record: structuredClone(record),
      });
      representedManagedIds.add(project.id);
    } else {
      snapshot.external.push({ project, extension: structuredClone(extension) });
    }
  }

  for (const record of Object.values(managed).sort((left, right) =>
    left.projectId.localeCompare(right.projectId),
  )) {
    if (record.projectId === COMPANION_PROJECT_ID || representedManagedIds.has(record.projectId)) {
      continue;
    }
    snapshot.missingManaged.push({
      record: structuredClone(record),
      project: projectsById.get(record.projectId) ?? null,
    });
  }

  return snapshot;
}

export async function reconcileHostInventory({
  projects,
  host,
  managed,
  hostExtensions,
}: {
  projects: readonly CatalogProject[];
  host: HostExtensionAdapter;
  managed: ManagedExtensionMap;
  hostExtensions?: readonly HostExtension[];
}): Promise<InventorySnapshot> {
  const extensions = hostExtensions
    ? hostExtensions.map((extension) => structuredClone(extension))
    : await host.discover();
  const initial = reconcileInventory({ projects, hostExtensions: extensions, managed });
  const ambiguousIdentities = new Set(
    initial.unknown
      .filter(({ reason }) => reason === "ambiguous-folder")
      .map(({ extension }) => extensionIdentity(extension)),
  );
  if (ambiguousIdentities.size === 0) return initial;

  const enriched = await Promise.all(
    extensions.map(async (extension) => {
      if (!ambiguousIdentities.has(extensionIdentity(extension))) return extension;
      try {
        const repositoryUrl = await host.readExtensionRepositoryUrl({
          internalName: extension.internalName,
          type: extension.type,
        });
        return repositoryUrl ? { ...extension, repositoryUrl } : extension;
      } catch {
        return extension;
      }
    }),
  );
  return reconcileInventory({ projects, hostExtensions: enriched, managed });
}

function extensionIdentity(extension: HostExtension): string {
  return `${extension.type}:${extension.internalName}`;
}

export async function pruneAbsentManagedRecords({
  observedManaged,
  hostExtensions,
  store,
}: {
  observedManaged: ManagedExtensionMap;
  hostExtensions: readonly HostExtension[];
  store: ProfileStore;
}): Promise<string[]> {
  const observedRegistry = new ManagedRegistry(observedManaged);
  const absentProjectIds = observedRegistry.pruneAbsent(hostExtensions);
  if (absentProjectIds.length === 0) return [];
  const currentBeforeUpdate = normalizeManagedExtensionMap(store.read().managedExtensions);
  const removableProjectIds = absentProjectIds.filter((projectId) => {
    const observed = observedManaged[projectId];
    return observed && sameManagedRecord(currentBeforeUpdate[projectId], observed);
  });
  if (removableProjectIds.length === 0) return [];

  const removedProjectIds: string[] = [];
  await store.update((draft) => {
    const currentRegistry = new ManagedRegistry(
      normalizeManagedExtensionMap(draft.managedExtensions),
    );
    const current = currentRegistry.read();
    for (const projectId of removableProjectIds) {
      const observed = observedManaged[projectId];
      if (!observed || !sameManagedRecord(current[projectId], observed)) continue;
      if (currentRegistry.remove(projectId)) removedProjectIds.push(projectId);
    }
    if (removedProjectIds.length > 0) draft.managedExtensions = currentRegistry.read();
  });
  return removedProjectIds.sort();
}

function sameManagedRecord(
  current: ManagedExtensionRecord | undefined,
  observed: ManagedExtensionRecord,
): boolean {
  return Boolean(
    current &&
    current.projectId === observed.projectId &&
    current.internalName === observed.internalName &&
    current.folderName === observed.folderName &&
    current.installedAt === observed.installedAt &&
    current.installedBy === observed.installedBy &&
    sameProvenance(current.provenance, observed.provenance),
  );
}

function sameProvenance(
  current: ManagedInstallProvenance | undefined,
  observed: ManagedInstallProvenance | undefined,
): boolean {
  if (!current || !observed) return current === observed;
  return (
    current.targetKind === observed.targetKind &&
    current.requestedSha === observed.requestedSha &&
    current.installedSha === observed.installedSha &&
    current.catalogGeneratedAt === observed.catalogGeneratedAt &&
    current.tavernKeeperReportId === observed.tavernKeeperReportId
  );
}
