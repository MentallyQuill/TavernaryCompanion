import type { HostExtensionAdapter } from "../host/host-types";
import type { OperationLock } from "../lifecycle/operation-lock";
import { createReceipt, type LifecycleReceipt } from "../lifecycle/operation-receipt";
import { COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import type { PreparedUpdateSelection } from "./update-types";

/** Offers are held in memory: stored receipts cannot authorize destructive operations. */
export function createUpdateReplacement({
  host,
  lock,
}: {
  host: HostExtensionAdapter;
  lock: OperationLock;
}) {
  const pending = new Map<
    string,
    {
      selection: PreparedUpdateSelection;
      name: string;
      removed: boolean;
      enabled: boolean;
    }
  >();
  return {
    has(id: string) {
      return pending.has(id);
    },
    cancel(id: string) {
      pending.delete(id);
    },
    async offer(id: string, selection: PreparedUpdateSelection, name: string): Promise<boolean> {
      if (selection.binding.projectId === COMPANION_PROJECT_ID) return false;
      try {
        const extension = (await host.discover()).find(
          (e) => e.internalName === selection.binding.internalName && e.type === "local",
        );
        if (!extension) return false;
        pending.set(id, {
          selection: structuredClone(selection),
          name,
          removed: false,
          enabled: extension.enabled,
        });
        return true;
      } catch {
        return false;
      }
    },
    async replace(id: string): Promise<LifecycleReceipt> {
      return lock.runExclusive(`replace:${id}`, async ({ setPhase }) => {
        const plan = pending.get(id);
        if (!plan) throw new Error("Check this extension for updates again.");
        const { selection, name } = plan;
        const { binding, target } = selection;
        const startedAt = new Date().toISOString();
        const capabilities = await host.getInstallCapabilities();
        if (
          !capabilities.localRevisionLookup ||
          (target.requestedSha && !capabilities.pinnedCommitInstall)
        ) {
          throw new Error(
            "SillyTavern cannot reinstall and verify the selected version. Nothing was removed.",
          );
        }
        const input = { internalName: binding.internalName, type: "local" as const };
        if (!plan.removed) {
          if ((await host.readLocalRevision(input)) !== binding.installedSha) {
            pending.delete(id);
            throw new Error(
              "The installed extension changed since this update failed. Check for updates again.",
            );
          }
          const extension = (await host.discover()).find(
            (e) => e.internalName === binding.internalName && e.type === "local",
          );
          if (!extension)
            throw new Error("The installed extension changed. Check for updates again.");
          plan.enabled = extension.enabled;
          setPhase("host-request");
          try {
            await host.remove(input);
            plan.removed = true;
          } catch {
            try {
              plan.removed = !(await host.discover()).some(
                (e) => e.internalName === binding.internalName && e.type === "local",
              );
            } catch {
              /* Unknown removal outcome must not trigger another removal. */
            }
            if (!plan.removed) {
              pending.delete(id);
              return createReceipt({
                id,
                kind: "update",
                projectId: binding.projectId,
                projectName: name,
                startedAt,
                finishedAt: new Date().toISOString(),
                status: "verification-failed",
                completedThrough: "requested",
                failedAt: "verified",
                reloadRequired: true,
                safeError:
                  "Companion could not confirm whether the extension was removed. Check it in SillyTavern before trying again.",
              });
            }
          }
        }
        // Never remove a new installation that appeared while a retry was pending.
        let alreadyInstalled: boolean;
        try {
          alreadyInstalled = (await host.discover()).some(
            (e) => e.internalName === binding.internalName && e.type === "local",
          );
        } catch {
          const receipt = createReceipt({
            id,
            kind: "update",
            projectId: binding.projectId,
            projectName: name,
            startedAt,
            finishedAt: new Date().toISOString(),
            status: "verification-failed",
            completedThrough: "requested",
            failedAt: "verified",
            reloadRequired: true,
            safeError: `${name} was removed, but Companion could not check whether it can be reinstalled. Retry installation to check again.`,
          });
          receipt.replacementRecovery = "retry-install";
          return receipt;
        }
        if (alreadyInstalled) {
          pending.delete(id);
          throw new Error("The extension is already installed. Check for updates again.");
        }
        try {
          setPhase("host-request");
          await host.install({
            repositoryUrl: binding.repositoryUrl,
            branch: binding.branch,
            commitSha: target.requestedSha,
          });
        } catch {
          let installed = true;
          try {
            installed = (await host.discover()).some(
              (e) => e.internalName === binding.internalName && e.type === "local",
            );
          } catch {
            /* Unknown installation state is not retryable. */
          }
          if (installed && !plan.enabled)
            await host.disable(binding.internalName).catch(() => undefined);
          const receipt = createReceipt({
            id,
            kind: "update",
            projectId: binding.projectId,
            projectName: name,
            startedAt,
            finishedAt: new Date().toISOString(),
            status: "failed",
            completedThrough: "requested",
            failedAt: "host-accepted",
            reloadRequired: true,
            safeError: installed
              ? "Companion could not verify the reinstallation. Check the extension in SillyTavern."
              : `${name} was removed, but reinstallation failed. Retry installation to finish.`,
          });
          if (!installed) receipt.replacementRecovery = "retry-install";
          else pending.delete(id);
          return receipt;
        }
        pending.delete(id);
        setPhase("verifying");
        let sha: string | null = null;
        let stateRestored = false;
        try {
          if (plan.enabled) await host.enable(binding.internalName);
          else await host.disable(binding.internalName);
          stateRestored = true;
          const extension = (await host.discover()).find(
            (e) => e.internalName === binding.internalName && e.type === "local",
          );
          sha = extension ? await host.readLocalRevision(input) : null;
        } catch {
          /* Return a receipt even when post-install inspection fails. */
        }
        const verified =
          sha !== null &&
          (target.requestedSha ? sha === target.requestedSha : sha !== binding.installedSha);
        return createReceipt({
          id,
          kind: "update",
          projectId: binding.projectId,
          projectName: name,
          startedAt,
          finishedAt: new Date().toISOString(),
          status: verified ? "succeeded" : "verification-failed",
          completedThrough: verified ? "verified" : "host-accepted",
          failedAt: verified ? undefined : "verified",
          reloadRequired: true,
          safeError: verified
            ? null
            : !stateRestored
              ? "The extension was reinstalled, but its enabled setting could not be restored. Manage it in SillyTavern before reloading."
              : "Companion could not verify the selected version after reinstallation. Manage it in SillyTavern.",
          installProvenance: {
            targetKind: target.kind,
            requestedSha: target.requestedSha,
            installedSha: sha,
            catalogGeneratedAt: binding.catalogGeneratedAt,
            tavernKeeperReportId: target.kind === "checked" ? target.reportId : null,
          },
        });
      });
    },
  };
}
