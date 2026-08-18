export function buildKitReferenceIndex(
  installed: readonly { kitId: string; installedProjectIds: readonly string[] }[],
): ReadonlyMap<string, readonly string[]> {
  const mutable = new Map<string, string[]>();
  for (const kit of installed) {
    for (const projectId of new Set(kit.installedProjectIds)) {
      const kitIds = mutable.get(projectId) ?? [];
      kitIds.push(kit.kitId);
      mutable.set(projectId, kitIds);
    }
  }
  return new Map(
    [...mutable].map(([projectId, kitIds]) => [projectId, Object.freeze(kitIds.sort())] as const),
  );
}
