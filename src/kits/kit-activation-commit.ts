import type { HostExtensionAdapter } from "../host/host-types";
import type { KitProjectStep } from "./kit-plan";

export async function applyActivationMutations({
  host,
  enable,
  disable,
  resolveInternalName,
}: {
  host: HostExtensionAdapter;
  enable: readonly KitProjectStep[];
  disable: readonly KitProjectStep[];
  resolveInternalName(projectId: string, planned: string | null): string | null;
}): Promise<{
  changed: boolean;
  failures: Array<{ projectId: string; action: "enable" | "disable"; error: string }>;
}> {
  const failures: Array<{ projectId: string; action: "enable" | "disable"; error: string }> = [];
  let changed = false;
  for (const [action, steps] of [
    ["enable", enable],
    ["disable", disable],
  ] as const) {
    for (const step of steps) {
      const internalName = resolveInternalName(step.projectId, step.internalName);
      if (!internalName) {
        failures.push({
          projectId: step.projectId,
          action,
          error: "Managed extension identity is unavailable.",
        });
        continue;
      }
      try {
        await host[action](internalName);
        changed = true;
      } catch (error) {
        failures.push({
          projectId: step.projectId,
          action,
          error: error instanceof Error ? error.message : "Host mutation failed.",
        });
      }
    }
  }
  return { changed, failures };
}
