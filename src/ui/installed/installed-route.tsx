import { useEffect } from "preact/hooks";

import type { InstalledSectionViewModel } from "../../catalog/installed-view-model";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import type { InstalledKitViewModel } from "../../kits/kit-view-model";
import type { ProjectUpdateState } from "../../updates/update-coordinator";
import type { InstalledInventoryLoadState } from "../inventory-refresh-coordinator";
import type { InstalledSelectionState } from "./installed-selection";
import { InstalledBulkBar } from "./installed-bulk-bar";
import { InstalledKitCard } from "./installed-kit-card";
import { InstalledSection } from "./installed-section";
import { InstalledStatusHelp } from "./installed-status-help";

interface InstalledRouteProps {
  sections: InstalledSectionViewModel[];
  kits?: readonly InstalledKitViewModel[];
  activeKitId?: string | null;
  loadState?: InstalledInventoryLoadState;
  refreshing?: boolean;
  togglingInternalName?: string | null;
  updateStates?: Readonly<Record<string, ProjectUpdateState>>;
  onRefresh(): void | Promise<void>;
  onCheckUpdates?(): void | Promise<void>;
  onRetryUpdate?(id: string): void;
  onUpdate?(id: string, anchor: HTMLButtonElement): void;
  onAction?(id: string, action: ProjectPrimaryAction, anchor: HTMLButtonElement): void;
  onManage?(): void;
  onOpenKit?(id: string): void;
  onUninstallKit?(id: string): void;
  onToggleExtension?(projectId: string, internalName: string, enabled: boolean): void;
  onSelectKit?(kitId: string): void;
  selection?: InstalledSelectionState;
  onToggleSelection?(projectId: string): void;
  onAddSelectedToKit?(): void;
  onUninstallSelected?(): void;
  onClearSelection?(): void;
  lifecycleDisabled?: boolean;
}

export function InstalledRoute({
  sections,
  kits = [],
  loadState = "ready",
  refreshing = false,
  togglingInternalName = null,
  updateStates = {},
  onRefresh,
  onCheckUpdates,
  onRetryUpdate,
  onUpdate,
  onAction,
  onManage,
  onOpenKit,
  onUninstallKit,
  onToggleExtension,
  onSelectKit,
  selection = { active: false, projectIds: [], sourceKitIds: [] },
  onToggleSelection,
  onAddSelectedToKit,
  onUninstallSelected,
  onClearSelection,
  lifecycleDisabled,
}: InstalledRouteProps): preact.JSX.Element {
  useEffect(() => {
    void onRefresh();
  }, [onRefresh]);
  useEffect(() => {
    if (!selection.active) return;
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('[role="dialog"][aria-modal="true"]'))
        return;
      event.preventDefault();
      onClearSelection?.();
    };
    window.addEventListener("keydown", clearOnEscape);
    return () => window.removeEventListener("keydown", clearOnEscape);
  }, [onClearSelection, selection.active]);
  const populatedSections = sections.filter((section) => section.rows.length > 0);
  const installedKits = kits;
  const kitSelectionAvailable = installedKits.some((kit) => kit.selectionProjectIds.length > 0);
  const checkingUpdates = Object.values(updateStates).some(({ kind }) => kind === "checking");
  const usingNativeUpdates = Object.values(updateStates).some(
    (state) =>
      (state.kind === "current" && state.native === true) ||
      (state.kind === "available" &&
        state.targets.some(({ requestedSha }) => requestedSha === null)),
  );
  const installedCount = populatedSections.reduce(
    (total, section) => total + section.rows.length,
    0,
  );
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
        {loadState === "loading" ? (
          <span role="status">Loading installed extensions…</span>
        ) : loadState === "error" ? (
          <span>Installed extensions unavailable</span>
        ) : (
          <span>
            {installedCount} installed {installedCount === 1 ? "extension" : "extensions"}
          </span>
        )}
        {loadState === "ready" && refreshing ? (
          <p role="status">Updating installed extensions…</p>
        ) : null}
        <button
          type="button"
          aria-label={
            loadState === "error"
              ? "Retry loading installed extensions"
              : checkingUpdates
                ? "Checking for updates"
                : "Check for updates"
          }
          disabled={loadState === "loading" || checkingUpdates || lifecycleDisabled}
          onClick={() => (loadState === "error" ? void onRefresh() : void onCheckUpdates?.())}
        >
          {loadState === "error" ? "Retry" : checkingUpdates ? "Checking…" : "Check again"}
        </button>
      </header>
      {loadState === "ready" && usingNativeUpdates ? (
        <p class="tavernary-companion-installed-update-note">
          SillyTavern can update extensions to the latest version from their creator. Updating to a
          specific TavernKeeper-scanned version isn’t supported by this build.
        </p>
      ) : null}
      {loadState === "ready" && installedKits.length ? (
        <section
          class="tavernary-companion-installed-kits"
          aria-labelledby="installed-kits-heading"
        >
          <header>
            <div>
              <div class="tavernary-companion-installed-kits__title">
                <h3 id="installed-kits-heading">Installed Kits</h3>
                <InstalledStatusHelp />
              </div>
              {kitSelectionAvailable ? (
                <p class="tavernary-companion-installed-selection-cta">
                  <strong>Select a Kit</strong> to choose its installed extensions.
                </p>
              ) : null}
            </div>
            <span>{installedKits.length}</span>
          </header>
          <div class="tavernary-companion-installed-kit-grid">
            {installedKits.map((kit) => (
              <InstalledKitCard
                key={kit.id}
                kit={kit}
                selected={selection.sourceKitIds.includes(kit.id)}
                onSelect={() => onSelectKit?.(kit.id)}
                onOpen={() => onOpenKit?.(kit.id)}
                onUninstall={() => onUninstallKit?.(kit.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
      {loadState === "ready" && populatedSections.length ? (
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
            onManage={onManage}
            onToggleExtension={onToggleExtension}
            lifecycleDisabled={lifecycleDisabled}
            selectedProjectIds={selection.projectIds}
            onToggleSelection={onToggleSelection}
          />
        ))
      ) : loadState === "ready" && installedKits.length === 0 ? (
        <p>No installed extensions were found in this profile.</p>
      ) : null}
      {loadState === "ready" && selection.active ? (
        <InstalledBulkBar
          count={selection.projectIds.length}
          disabled={lifecycleDisabled}
          onAddToKit={() => onAddSelectedToKit?.()}
          onUninstall={() => onUninstallSelected?.()}
          onClear={() => onClearSelection?.()}
        />
      ) : null}
    </section>
  );
}
