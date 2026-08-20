import { createReceipt, type LifecycleReceipt } from "./operation-receipt";
import type { RemovalImpact } from "./removal-impact";

interface BulkRemovalLifecycle {
  previewRemoval(projectId: string): Promise<RemovalImpact>;
  remove(projectId: string): Promise<LifecycleReceipt>;
}

export interface BulkRemovalPlan {
  projectIds: string[];
  impacts: RemovalImpact[];
  affectedKits: Array<{ id: string; title: string; resultingStatus: "Partial" | "Missing" }>;
  activeKitAffected: boolean;
  confirmable: boolean;
  fingerprint: string;
}

export interface BulkRemovalReceipt extends Record<string, unknown> {
  formatVersion: 1;
  id: string;
  kind: "bulk-remove";
  planFingerprint: string;
  startedAt: string;
  completedAt: string;
  status: "succeeded" | "partial" | "failed";
  projectIds: string[];
  results: LifecycleReceipt[];
  retryableProjectIds: string[];
  reloadRequired: boolean;
}

export class BulkRemovalPlanChangedError extends Error {
  constructor() {
    super("The installed extensions changed after review. Review the uninstall again.");
    this.name = "BulkRemovalPlanChangedError";
  }
}

export async function prepareBulkRemoval(
  lifecycle: BulkRemovalLifecycle,
  projectIds: readonly string[],
): Promise<BulkRemovalPlan> {
  const uniqueIds = [...new Set(projectIds)];
  const impacts: RemovalImpact[] = [];
  for (const projectId of uniqueIds) impacts.push(await lifecycle.previewRemoval(projectId));
  const affectedKitCounts = new Map<
    string,
    { id: string; title: string; installedProjectCount: number; selectedCount: number }
  >();
  for (const impact of impacts) {
    for (const kit of impact.installedKits) {
      const current = affectedKitCounts.get(kit.id);
      affectedKitCounts.set(kit.id, {
        ...kit,
        installedProjectCount: Math.max(
          kit.installedProjectCount,
          current?.installedProjectCount ?? 0,
        ),
        selectedCount: (current?.selectedCount ?? 0) + 1,
      });
    }
  }
  const affectedKits = [...affectedKitCounts.values()]
    .map(({ id, title, installedProjectCount, selectedCount }) => ({
      id,
      title,
      resultingStatus:
        selectedCount >= installedProjectCount ? ("Missing" as const) : ("Partial" as const),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
  const confirmable = impacts.length > 0 && impacts.every(({ removable }) => removable);
  return {
    projectIds: uniqueIds,
    impacts,
    affectedKits,
    activeKitAffected: impacts.some(({ activeKitAffected }) => activeKitAffected),
    confirmable,
    fingerprint: removalFingerprint(impacts),
  };
}

export async function executeBulkRemoval(
  lifecycle: BulkRemovalLifecycle,
  plan: BulkRemovalPlan,
  createId: () => string,
  now: () => string = () => new Date().toISOString(),
): Promise<BulkRemovalReceipt> {
  if (!plan.confirmable) throw new BulkRemovalPlanChangedError();
  const current = await prepareBulkRemoval(lifecycle, plan.projectIds);
  if (!current.confirmable || current.fingerprint !== plan.fingerprint)
    throw new BulkRemovalPlanChangedError();

  const startedAt = now();
  const results: LifecycleReceipt[] = [];
  for (const impact of current.impacts) {
    try {
      results.push(await lifecycle.remove(impact.projectId));
    } catch {
      results.push(
        createReceipt({
          id: `${createId()}-${impact.projectId}`,
          kind: "remove",
          projectId: impact.projectId,
          projectName: impact.projectName,
          startedAt,
          finishedAt: now(),
          status: "failed",
          safeError: "The uninstall request could not be completed.",
          reloadRequired: false,
        }),
      );
    }
  }
  const retryableProjectIds = results
    .filter(({ status }) => status !== "succeeded" && status !== "removed-unrecorded")
    .map(({ projectId }) => projectId);
  const succeeded = results.length - retryableProjectIds.length;
  return {
    formatVersion: 1,
    id: createId(),
    kind: "bulk-remove",
    planFingerprint: plan.fingerprint,
    startedAt,
    completedAt: now(),
    status: retryableProjectIds.length === 0 ? "succeeded" : succeeded === 0 ? "failed" : "partial",
    projectIds: [...plan.projectIds],
    results,
    retryableProjectIds,
    reloadRequired: results.some(({ reloadRequired }) => reloadRequired),
  };
}

export function parseBulkRemovalReceipt(value: unknown): BulkRemovalReceipt | null {
  if (!isRecord(value)) return null;
  if (
    value.formatVersion !== 1 ||
    value.kind !== "bulk-remove" ||
    typeof value.id !== "string" ||
    typeof value.planFingerprint !== "string" ||
    !isTimestamp(value.startedAt) ||
    !isTimestamp(value.completedAt) ||
    (value.status !== "succeeded" && value.status !== "partial" && value.status !== "failed") ||
    !isStringArray(value.projectIds) ||
    !isStringArray(value.retryableProjectIds) ||
    typeof value.reloadRequired !== "boolean" ||
    !Array.isArray(value.results) ||
    !value.results.every(isRemovalReceipt)
  ) {
    return null;
  }
  return structuredClone(value) as BulkRemovalReceipt;
}

function removalFingerprint(impacts: readonly RemovalImpact[]): string {
  const payload = JSON.stringify(
    impacts.map(({ projectId, ownership, removable, installedKits, activeKitAffected }) => ({
      projectId,
      ownership,
      removable,
      installedKitIds: installedKits.map(({ id }) => id).sort(),
      activeKitAffected,
    })),
  );
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1)
    hash = Math.imul(hash ^ payload.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isRemovalReceipt(value: unknown): value is LifecycleReceipt {
  return (
    isRecord(value) &&
    value.kind === "remove" &&
    typeof value.id === "string" &&
    typeof value.projectId === "string" &&
    typeof value.projectName === "string" &&
    typeof value.status === "string" &&
    Array.isArray(value.steps) &&
    typeof value.reloadRequired === "boolean"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
