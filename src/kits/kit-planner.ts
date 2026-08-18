import type { CatalogProject, CatalogV7 } from "../catalog/catalog-core";
import type { InventorySnapshot, ManagedExtensionMap } from "../inventory/inventory-types";
import { COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import type { InstalledKitStateV1 } from "./kit-types";
import { freezeKitPlan, type KitOperation, type KitPlan, type KitProjectStep } from "./kit-plan";
import { buildKitReferenceIndex } from "./kit-reference-index";

export interface PlannableKit {
  id: string;
  projectIds: readonly string[];
  origin: "personal" | "published";
}

export interface PlanKitOperationInput {
  operation: KitOperation;
  kit: PlannableKit;
  catalog: CatalogV7;
  inventory: InventorySnapshot;
  managed: ManagedExtensionMap;
  installedKits: readonly InstalledKitStateV1[];
  activeKitId: string | null;
  catalogCanMutate: boolean;
}

export function planKitOperation(input: PlanKitOperationInput): Readonly<KitPlan> {
  const projectById = new Map(input.catalog.projects.map((project) => [project.id, project]));
  const managedById = new Map(input.inventory.managed.map((entry) => [entry.project.id, entry]));
  const externalById = new Map(input.inventory.external.map((entry) => [entry.project.id, entry]));
  const references = buildKitReferenceIndex(input.installedKits);
  const plan: KitPlan = {
    id: planId(input),
    operation: input.operation,
    kitId: input.kit.id,
    catalogGeneratedAt: input.catalog.generatedAt,
    inventoryFingerprint: inventoryFingerprint(input),
    requiredProjectIds: [...input.kit.projectIds],
    install: [],
    enable: [],
    disable: [],
    remove: [],
    alreadyManaged: [],
    externalContext: [],
    contextOnly: [],
    keptForOtherKits: [],
    warnings: [],
    blockingIssues: [],
    reloadRequired: false,
  };
  if (!input.catalogCanMutate) {
    plan.blockingIssues.push({
      code: "catalog-incompatible",
      projectId: null,
      message: "Update Companion before changing Kits.",
    });
  }
  for (const projectId of input.kit.projectIds) {
    const project = projectById.get(projectId);
    if (projectId === COMPANION_PROJECT_ID) {
      if (input.kit.origin === "published")
        plan.contextOnly.push(step(projectId, "Tavernary Companion", null));
      else
        plan.blockingIssues.push({
          code: "companion-member",
          projectId,
          message: "Companion cannot belong to a personal Kit.",
        });
      continue;
    }
    if (!project) {
      plan.blockingIssues.push({
        code: "project-unavailable",
        projectId,
        message: `${projectId} is unavailable.`,
      });
      continue;
    }
    if (!isActionable(project)) {
      plan.contextOnly.push(stepFor(project, null));
      if (project.kind === "extension")
        plan.blockingIssues.push({
          code: "invalid-install-contract",
          projectId,
          message: `${project.name} cannot be installed by Companion.`,
        });
      continue;
    }
    addWarning(plan, project);
    const managedEntry = managedById.get(projectId);
    const externalEntry = externalById.get(projectId);
    if (externalEntry) {
      plan.externalContext.push(stepFor(project, externalEntry.extension.internalName));
      continue;
    }
    if (managedEntry) {
      plan.alreadyManaged.push(stepFor(project, managedEntry.extension.internalName));
    }
    if (input.operation === "install" || input.operation === "activate") {
      if (!managedEntry) plan.install.push(stepFor(project, null));
      if (input.operation === "activate")
        plan.enable.push(stepFor(project, managedEntry?.extension.internalName ?? null));
    } else if (input.operation === "deactivate") {
      if (managedEntry?.extension.enabled)
        plan.disable.push(stepFor(project, managedEntry.extension.internalName));
    } else {
      if (!managedEntry) continue;
      const otherReferences = (references.get(projectId) ?? []).filter((id) => id !== input.kit.id);
      if (otherReferences.length)
        plan.keptForOtherKits.push(stepFor(project, managedEntry.extension.internalName));
      else plan.remove.push(stepFor(project, managedEntry.extension.internalName));
    }
  }
  if (input.operation === "activate" && input.activeKitId && input.activeKitId !== input.kit.id) {
    const previous = input.installedKits.find(({ kitId }) => kitId === input.activeKitId);
    for (const projectId of previous?.installedProjectIds ?? []) {
      if (input.kit.projectIds.includes(projectId)) continue;
      const entry = managedById.get(projectId);
      if (entry?.extension.enabled)
        plan.disable.push(stepFor(entry.project, entry.extension.internalName));
    }
  }
  if (input.operation === "uninstall" && input.activeKitId === input.kit.id) {
    for (const entry of input.inventory.managed) {
      if (input.kit.projectIds.includes(entry.project.id) && entry.extension.enabled) {
        plan.disable.push(stepFor(entry.project, entry.extension.internalName));
      }
    }
  }
  plan.reloadRequired = Boolean(
    plan.install.length || plan.enable.length || plan.disable.length || plan.remove.length,
  );
  return freezeKitPlan(plan);
}

export function inventoryFingerprint(
  input: Pick<PlanKitOperationInput, "inventory" | "managed" | "installedKits" | "activeKitId">,
): string {
  const payload = JSON.stringify({
    managed: input.inventory.managed
      .map(({ project, extension }) => [project.id, extension.internalName, extension.enabled])
      .sort(),
    external: input.inventory.external
      .map(({ project, extension }) => [project.id, extension.internalName, extension.enabled])
      .sort(),
    records: Object.keys(input.managed).sort(),
    installedKits: input.installedKits
      .map(({ kitId, installedProjectIds }) => [kitId, [...installedProjectIds].sort()])
      .sort(),
    activeKitId: input.activeKitId,
  });
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1)
    hash = Math.imul(hash ^ payload.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function planId(input: PlanKitOperationInput): string {
  return `${input.operation}:${input.kit.id}:${input.catalog.generatedAt}:${inventoryFingerprint(input)}`;
}
function isActionable(project: CatalogProject): boolean {
  return (
    project.kind === "extension" &&
    project.frontends.some(({ id }) => id === "sillytavern") &&
    project.install?.kind === "sillytavern-extension-git"
  );
}
function step(projectId: string, projectName: string, internalName: string | null): KitProjectStep {
  return { projectId, projectName, internalName };
}
function stepFor(project: CatalogProject, internalName: string | null): KitProjectStep {
  return step(project.id, project.name, internalName);
}
function addWarning(plan: KitPlan, project: CatalogProject): void {
  const assessment = project.tavernKeeper;
  if (assessment?.riskLevel !== "material" && assessment?.riskLevel !== "high") return;
  plan.warnings.push({
    projectId: project.id,
    projectName: project.name,
    severity: assessment.riskLevel,
    freshness: assessment.freshness,
    reportUrl: assessment.report?.reportUrl ?? null,
  });
}
