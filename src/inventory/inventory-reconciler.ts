import type { CatalogProject } from "../catalog/catalog-core";
import type { HostExtension, HostExtensionAdapter } from "../host/host-types";
import { COMPANION_PROJECT_ID } from "./managed-registry";
import type { InventorySnapshot, ManagedExtensionMap } from "./inventory-types";
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
