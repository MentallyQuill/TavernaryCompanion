import type { CatalogProject } from "../catalog/catalog-core";
import { COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import type { PersonalKitV1 } from "./kit-types";

export interface KitDraftState {
  sourceId: string | null;
  title: string;
  description: string;
  targetFrontend: "sillytavern";
  projectIds: string[];
  dirty: boolean;
  issues: string[];
}

export function createKitDraft(source?: PersonalKitV1): KitDraftState {
  return validateDraft({
    sourceId: source?.id ?? null,
    title: source?.title ?? "",
    description: source?.description ?? "",
    targetFrontend: "sillytavern",
    projectIds: [...(source?.projectIds ?? [])],
    dirty: false,
    issues: [],
  });
}
export function updateKitDraft(
  draft: KitDraftState,
  change: Partial<Pick<KitDraftState, "title" | "description" | "projectIds">>,
): KitDraftState {
  return validateDraft({
    ...draft,
    ...change,
    projectIds: change.projectIds ? [...change.projectIds] : draft.projectIds,
    dirty: true,
    issues: [],
  });
}
export function addDraftMember(draft: KitDraftState, projectId: string): KitDraftState {
  if (projectId === COMPANION_PROJECT_ID || draft.projectIds.includes(projectId)) return draft;
  return updateKitDraft(draft, { projectIds: [...draft.projectIds, projectId] });
}
export function addDraftMembers(
  draft: KitDraftState,
  projectIds: readonly string[],
): KitDraftState {
  return projectIds.reduce(addDraftMember, draft);
}
export function moveDraftMember(
  draft: KitDraftState,
  projectId: string,
  direction: -1 | 1,
): KitDraftState {
  const index = draft.projectIds.indexOf(projectId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= draft.projectIds.length) return draft;
  const ids = [...draft.projectIds];
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return updateKitDraft(draft, { projectIds: ids });
}
export function selectableKitProjects(projects: readonly CatalogProject[]): CatalogProject[] {
  return projects.filter(
    (project) =>
      project.id !== COMPANION_PROJECT_ID &&
      project.kind === "extension" &&
      project.frontends.some(({ id }) => id === "sillytavern") &&
      project.install,
  );
}
function validateDraft(draft: KitDraftState): KitDraftState {
  const issues: string[] = [];
  if (!draft.title.trim()) issues.push("Title is required.");
  if (draft.projectIds.includes(COMPANION_PROJECT_ID))
    issues.push("Companion cannot belong to a Kit.");
  if (new Set(draft.projectIds).size !== draft.projectIds.length)
    issues.push("Duplicate projects are not allowed.");
  return { ...draft, title: draft.title, description: draft.description, issues };
}
