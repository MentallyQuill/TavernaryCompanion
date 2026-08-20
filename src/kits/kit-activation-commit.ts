import type { HostExtensionAdapter } from "../host/host-types";
import type { KitProjectStep } from "./kit-plan";

export interface ActivationMutationResult {
  projectId: string;
  action: "enable" | "disable";
  changed: boolean;
  error: string | null;
}

export async function applyActivationMutations({
  host,
  enable,
  disable,
  resolveInternalName,
  onResult,
}: {
  host: HostExtensionAdapter;
  enable: readonly KitProjectStep[];
  disable: readonly KitProjectStep[];
  resolveInternalName(projectId: string, planned: string | null): string | null;
  onResult?(result: Readonly<ActivationMutationResult>): void | Promise<void>;
}): Promise<{
  changed: boolean;
  failures: Array<{ projectId: string; action: "enable" | "disable"; error: string }>;
  results: ActivationMutationResult[];
}> {
  const failures: Array<{ projectId: string; action: "enable" | "disable"; error: string }> = [];
  const results: ActivationMutationResult[] = [];
  let changed = false;
  for (const [action, steps] of [
    ["enable", enable],
    ["disable", disable],
  ] as const) {
    for (const step of steps) {
      const internalName = resolveInternalName(step.projectId, step.internalName);
      if (!internalName) {
        const failure = {
          projectId: step.projectId,
          action,
          error: "Managed extension identity is unavailable.",
        };
        failures.push(failure);
        const mutation = { ...failure, changed: false };
        results.push(mutation);
        await onResult?.(mutation);
        continue;
      }
      try {
        await host[action](internalName);
        changed = true;
        const mutation: ActivationMutationResult = {
          projectId: step.projectId,
          action,
          changed: true,
          error: null,
        };
        results.push(mutation);
        await onResult?.(mutation);
      } catch (error) {
        const failure = {
          projectId: step.projectId,
          action,
          error: error instanceof Error ? error.message : "Host mutation failed.",
        };
        failures.push(failure);
        const mutation = { ...failure, changed: false };
        results.push(mutation);
        await onResult?.(mutation);
      }
    }
  }
  return { changed, failures, results };
}
