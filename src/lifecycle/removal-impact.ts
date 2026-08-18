export interface RemovalImpact {
  projectId: string;
  projectName: string;
  ownership: "managed" | "external" | "absent";
  ownershipLabel: "Managed by Companion" | "Installed outside Companion" | "Not installed";
  installedKits: Array<{ id: string; title: string }>;
  activeKitAffected: boolean;
  removable: boolean;
  confirmation: string;
}

export function previewRemovalImpact({
  projectId,
  projectName,
  ownership,
  installedKits,
  activeKitId,
  removable,
  kitTitles = {},
}: {
  projectId: string;
  projectName: string;
  ownership: RemovalImpact["ownership"];
  installedKits: Record<string, unknown>;
  activeKitId: string | null;
  removable: boolean;
  kitTitles?: Readonly<Record<string, string>>;
}): RemovalImpact {
  const references = kitReferences(projectId, installedKits, kitTitles);
  const activeKitAffected = references.some(({ id }) => id === activeKitId);
  const kitNames = references.map(({ title }) => title).join(", ");
  const consequence =
    references.length === 0
      ? ""
      : ` ${kitNames} will become incomplete${activeKitAffected ? ", and the active Kit will show drift" : ""}.`;
  return {
    projectId,
    projectName,
    ownership,
    ownershipLabel: {
      managed: "Managed by Companion" as const,
      external: "Installed outside Companion" as const,
      absent: "Not installed" as const,
    }[ownership],
    installedKits: references,
    activeKitAffected,
    removable,
    confirmation: `Uninstall ${projectName}?${consequence}`,
  };
}

export function markInstalledKitsIncomplete(
  installedKits: Record<string, unknown>,
  projectId: string,
): Record<string, unknown> {
  const next = structuredClone(installedKits);
  for (const [kitId, candidate] of Object.entries(next)) {
    if (!kitProjectIds(candidate).includes(projectId) || !isRecord(candidate)) continue;
    const missing = Array.isArray(candidate.missingProjectIds)
      ? candidate.missingProjectIds.filter((value): value is string => typeof value === "string")
      : [];
    next[kitId] = {
      ...candidate,
      status: "incomplete",
      missingProjectIds: [...new Set([...missing, projectId])].sort(),
    };
  }
  return next;
}

function kitReferences(
  projectId: string,
  installedKits: Record<string, unknown>,
  kitTitles: Readonly<Record<string, string>>,
) {
  return Object.entries(installedKits)
    .filter(([, candidate]) => kitProjectIds(candidate).includes(projectId))
    .map(([id]) => ({
      id,
      title: kitTitles[id] ?? id,
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

function kitProjectIds(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const ids = Array.isArray(value.installedProjectIds) ? value.installedProjectIds : [];
  return ids.filter((candidate): candidate is string => typeof candidate === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
