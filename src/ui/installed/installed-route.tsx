import { useEffect } from "preact/hooks";

import type { InstalledSectionViewModel } from "../../catalog/installed-view-model";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import type { InstalledKitViewModel } from "../../kits/kit-view-model";
import type { ProjectUpdateState } from "../../updates/update-coordinator";
import { InstalledSection } from "./installed-section";

interface InstalledRouteProps {
  sections: InstalledSectionViewModel[];
  kits?: readonly InstalledKitViewModel[];
  activeKitId?: string | null;
  refreshing?: boolean;
  togglingInternalName?: string | null;
  updateStates?: Readonly<Record<string, ProjectUpdateState>>;
  onRefresh(): void | Promise<void>;
  onCheckUpdates?(): void | Promise<void>;
  onRetryUpdate?(id: string): void;
  onUpdate?(id: string, anchor: HTMLButtonElement): void;
  onAction?(id: string, action: ProjectPrimaryAction, anchor: HTMLButtonElement): void;
  onForgetMissing?(id: string): void;
  onManage?(): void;
  onOpenKit?(id: string): void;
  onUninstallKit?(id: string): void;
  onToggleExtension?(projectId: string, internalName: string, enabled: boolean): void;
  lifecycleDisabled?: boolean;
}

export function InstalledRoute({
  sections,
  kits = [],
  activeKitId = null,
  refreshing = false,
  togglingInternalName = null,
  updateStates = {},
  onRefresh,
  onCheckUpdates,
  onRetryUpdate,
  onUpdate,
  onAction,
  onForgetMissing,
  onManage,
  onOpenKit,
  onUninstallKit,
  onToggleExtension,
  lifecycleDisabled,
}: InstalledRouteProps): preact.JSX.Element {
  useEffect(() => {
    void onRefresh();
  }, [onRefresh]);
  const populatedSections = sections.filter((section) => section.rows.length > 0);
  const installedKits = kits;
  const checkingUpdates = Object.values(updateStates).some(({ kind }) => kind === "checking");
  const usingNativeUpdates = Object.values(updateStates).some(
    (state) =>
      (state.kind === "current" && state.native === true) ||
      (state.kind === "available" &&
        state.targets.some(({ requestedSha }) => requestedSha === null)),
  );
  const installedCount = populatedSections
    .filter(({ id }) => id !== "attention")
    .reduce((total, section) => total + section.rows.length, 0);
  const memberships = new Map<string, string[]>();
  for (const kit of installedKits) {
    for (const projectId of kit.installedProjectIds) {
      const titles = memberships.get(projectId) ?? [];
      if (!titles.includes(kit.title)) titles.push(kit.title);
      memberships.set(projectId, titles);
    }
  }
  return (
    <section class="tavernary-companion-installed-route" aria-labelledby="installed-heading">
      <h2 id="installed-heading" class="tavernary-companion-sr-only">
        Installed extensions
      </h2>
      <header class="tavernary-companion-route-toolbar">
        <strong aria-hidden="true">Installed</strong>
        <span>
          {installedCount} installed {installedCount === 1 ? "extension" : "extensions"}
        </span>
        {refreshing ? <p role="status">Updating installed extensions…</p> : null}
        <button
          type="button"
          aria-label={checkingUpdates ? "Checking for updates" : "Check for updates"}
          disabled={checkingUpdates || lifecycleDisabled}
          onClick={() => void onCheckUpdates?.()}
        >
          {checkingUpdates ? "Checking…" : "Check again"}
        </button>
      </header>
      {usingNativeUpdates ? (
        <p class="tavernary-companion-installed-update-note">
          SillyTavern can update extensions to their newest version. Updating to a specific
          TavernKeeper-scanned version isn’t supported by this build.
        </p>
      ) : null}
      {installedKits.length ? (
        <section
          class="tavernary-companion-installed-kits"
          aria-labelledby="installed-kits-heading"
        >
          <header>
            <h3 id="installed-kits-heading">Installed Kits</h3>
            <span>{installedKits.length}</span>
          </header>
          <div class="tavernary-companion-installed-grid">
            {installedKits.map((kit) => {
              const active = kit.id === activeKitId || kit.operationalStatus === "Active";
              return (
                <article
                  key={kit.id}
                  class={`tavernary-companion-installed-card tavernary-companion-installed-kit-card is-installed${active ? " is-active" : ""}`}
                >
                  <header>
                    <span>{kit.originLabel}</span>
                    <strong>{active ? "Active Kit" : kit.operationalStatus}</strong>
                  </header>
                  <h4>{kit.title}</h4>
                  {kit.description ? <p>{kit.description}</p> : null}
                  <div class="tavernary-companion-installed-kit-components">
                    {kit.components.map((component) => (
                      <span key={component.projectId}>{component.name}</span>
                    ))}
                  </div>
                  <footer>
                    {kit.orphaned ? (
                      <button
                        type="button"
                        aria-label={`Uninstall ${kit.title}`}
                        onClick={() => onUninstallKit?.(kit.id)}
                      >
                        Uninstall Kit
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Open ${kit.title}`}
                        onClick={() => onOpenKit?.(kit.id)}
                      >
                        View Kit
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {populatedSections.length ? (
        populatedSections.map((section) => (
          <InstalledSection
            key={section.id}
            section={section}
            memberships={memberships}
            togglingInternalName={togglingInternalName}
            updateStates={updateStates}
            onAction={onAction}
            onRetryUpdate={onRetryUpdate}
            onUpdate={onUpdate}
            onForgetMissing={onForgetMissing}
            onManage={onManage}
            onToggleExtension={onToggleExtension}
            lifecycleDisabled={lifecycleDisabled}
          />
        ))
      ) : installedKits.length === 0 ? (
        <p>No installed extensions were found in this profile.</p>
      ) : null}
    </section>
  );
}
