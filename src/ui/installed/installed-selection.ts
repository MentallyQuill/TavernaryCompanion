export interface InstalledSelectionState {
  active: boolean;
  projectIds: string[];
  sourceKitIds: string[];
}

export const EMPTY_INSTALLED_SELECTION: InstalledSelectionState = {
  active: false,
  projectIds: [],
  sourceKitIds: [],
};

export function clearInstalledSelection(): InstalledSelectionState {
  return EMPTY_INSTALLED_SELECTION;
}

export function selectInstalledKit(
  state: InstalledSelectionState,
  kitId: string,
  projectIds: readonly string[],
): InstalledSelectionState {
  if (projectIds.length === 0) return state;
  return {
    active: true,
    projectIds: [...new Set([...state.projectIds, ...projectIds])],
    sourceKitIds: [...new Set([...state.sourceKitIds, kitId])],
  };
}

export function toggleInstalledProject(
  state: InstalledSelectionState,
  projectId: string,
): InstalledSelectionState {
  if (state.projectIds.length === 1 && state.projectIds[0] === projectId) {
    return EMPTY_INSTALLED_SELECTION;
  }
  return {
    ...state,
    active: true,
    projectIds: state.projectIds.includes(projectId)
      ? state.projectIds.filter((id) => id !== projectId)
      : [...state.projectIds, projectId],
  };
}

export function reconcileInstalledSelection(
  state: InstalledSelectionState,
  selectableProjectIds: readonly string[],
  kitMembersById: Readonly<Record<string, readonly string[]>>,
): InstalledSelectionState {
  const selectable = new Set(selectableProjectIds);
  const projectIds = state.projectIds.filter((id) => selectable.has(id));
  if (projectIds.length === 0) return EMPTY_INSTALLED_SELECTION;
  const selected = new Set(projectIds);
  const sourceKitIds = state.sourceKitIds.filter((kitId) => {
    const members = (kitMembersById[kitId] ?? []).filter((id) => selectable.has(id));
    return members.length > 0 && members.every((id) => selected.has(id));
  });
  return { active: true, projectIds, sourceKitIds };
}
