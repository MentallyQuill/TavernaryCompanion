import { useEffect } from "preact/hooks";

import type { InstalledSectionViewModel } from "../../catalog/installed-view-model";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import { InstalledSection } from "./installed-section";

interface InstalledRouteProps {
  sections: InstalledSectionViewModel[];
  refreshing?: boolean;
  onRefresh(): void | Promise<void>;
  onAction?(id: string, action: ProjectPrimaryAction): void;
  onManage?(): void;
  lifecycleDisabled?: boolean;
}

export function InstalledRoute({
  sections,
  refreshing = false,
  onRefresh,
  onAction,
  onManage,
  lifecycleDisabled,
}: InstalledRouteProps): preact.JSX.Element {
  useEffect(() => {
    void onRefresh();
  }, [onRefresh]);
  const populatedSections = sections.filter((section) => section.rows.length > 0);
  const installedCount = populatedSections.reduce(
    (total, section) => total + section.rows.length,
    0,
  );
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
      </header>
      {populatedSections.length ? (
        populatedSections.map((section) => (
          <InstalledSection
            key={section.id}
            section={section}
            onAction={onAction}
            onManage={onManage}
            lifecycleDisabled={lifecycleDisabled}
          />
        ))
      ) : (
        <p>No installed extensions were found in this profile.</p>
      )}
    </section>
  );
}
