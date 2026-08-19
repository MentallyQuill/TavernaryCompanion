import type { CatalogSnapshot } from "../catalog/catalog-client";
import type { CatalogV7 } from "../catalog/catalog-core";
import type { HostExtensionAdapter } from "../host/host-types";
import { sha256Hex } from "../integrity/sha256";
import type { InstallTarget } from "../lifecycle/install-target";
import { prepareInstallTargetChoice } from "../lifecycle/install-target-resolver";
import { freezeKitPlan, type KitPlan } from "./kit-plan";

export interface KitInstallTargetSelection {
  projectId: string;
  target: InstallTarget;
}

export async function prepareKitInstallTargets(input: {
  plan: Readonly<KitPlan>;
  catalog: CatalogV7;
  host: HostExtensionAdapter;
  now?: () => string;
}): Promise<Readonly<KitPlan>> {
  const plan = structuredClone(input.plan) as KitPlan;
  if (plan.blockingIssues.some(({ code }) => code === "catalog-incompatible")) {
    throw new Error("Update Companion before changing Kits.");
  }
  const snapshot: CatalogSnapshot = {
    state: "ready-current",
    canMutate: true,
    checkedAt: null,
    catalog: structuredClone(input.catalog),
  };
  const projects = new Map(input.catalog.projects.map((project) => [project.id, project]));
  for (const step of plan.install) {
    const project = projects.get(step.projectId);
    if (!project) throw new Error(`${step.projectName} is no longer available.`);
    step.targetChoice = await prepareInstallTargetChoice({
      host: input.host,
      snapshot,
      project,
      now: input.now,
    });
  }
  plan.installTargetsPrepared = true;
  return freezeKitPlan(plan);
}

export function initialInstallTargetSelections(
  plan: Readonly<KitPlan>,
): KitInstallTargetSelection[] {
  return plan.install.flatMap((step) =>
    step.targetChoice?.kind === "single"
      ? [{ projectId: step.projectId, target: structuredClone(step.targetChoice.target) }]
      : [],
  );
}

export function computeInstallTargetBinding(
  selections: readonly KitInstallTargetSelection[],
): string {
  return sha256Hex(
    JSON.stringify(
      selections
        .map(({ projectId, target }) => [projectId, normalizeTarget(target)] as const)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
}

export function validateInstallTargetApproval(
  plan: Readonly<KitPlan>,
  selections: readonly KitInstallTargetSelection[],
  binding: string,
): void {
  if (plan.install.length > 0 && !plan.installTargetsPrepared) {
    throw new Error("Kit install targets were not prepared.");
  }
  if (binding !== computeInstallTargetBinding(selections)) {
    throw new Error("Kit install target binding does not match the selected versions.");
  }
  const selected = new Map<string, InstallTarget>();
  for (const selection of selections) {
    if (selected.has(selection.projectId))
      throw new Error("A Kit install target was selected twice.");
    selected.set(selection.projectId, selection.target);
  }
  if (selected.size !== plan.install.length) {
    throw new Error("Every Kit install target must be selected.");
  }
  for (const step of plan.install) {
    const target = selected.get(step.projectId);
    const choice = step.targetChoice;
    if (!target || !choice) throw new Error("Every Kit install target must be selected.");
    if (choice.kind === "single") {
      if (!sameTarget(target, choice.target)) throw new Error("A Kit install target changed.");
      continue;
    }
    const checkedSelected = sameTarget(target, choice.checked.target);
    const newestSelected = sameTarget(target, choice.newest);
    if (!checkedSelected && !newestSelected) throw new Error("A Kit install target changed.");
    if (checkedSelected && choice.checked.disabledReason) {
      throw new Error("The checked version is not available for this Kit install.");
    }
  }
}

export function sameInstallTarget(left: InstallTarget, right: InstallTarget): boolean {
  return sameTarget(left, right);
}

function sameTarget(left: InstallTarget, right: InstallTarget): boolean {
  return JSON.stringify(normalizeTarget(left)) === JSON.stringify(normalizeTarget(right));
}

function normalizeTarget(target: InstallTarget): Record<string, string | null> {
  return target.kind === "checked"
    ? {
        kind: target.kind,
        requestedSha: target.requestedSha.toLowerCase(),
        checkedAt: target.checkedAt,
        reportId: target.reportId,
        reportUrl: target.reportUrl,
      }
    : {
        kind: target.kind,
        requestedSha: target.requestedSha?.toLowerCase() ?? null,
        resolvedAt: target.resolvedAt,
      };
}
