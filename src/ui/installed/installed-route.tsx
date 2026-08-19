import { useEffect } from "preact/hooks";

import type { InstalledSectionViewModel } from "../../catalog/installed-view-model";
import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import { InstalledSection } from "./installed-section";

interface InstalledRouteProps {
  sections: InstalledSectionViewModel[];
  refreshing?: boolean;
  onRefresh(): void | Promise<void>;
  onOpenProject?(id: string): void;
  onAction?(id: string, action: ProjectPrimaryAction): void;
  onManage?(): void;
  lifecycleDisabled?: boolean;
}

export function InstalledRoute({
  sections,
  refreshing = false,
  onRefresh,
  onOpenProject,
  onAction,
  onManage,
  lifecycleDisabled,
}: InstalledRouteProps): preact.JSX.Element {
  useEffect(() => {
    void onRefresh();
  }, [onRefresh]);
  const populatedSections = sections.filter((section) => section.rows.length > 0);
  return (
    <section class="tavernary-companion-installed-route" aria-labelledby="installed-heading">
      <header>
        <h2 id="installed-heading">Installed extensions</h2>
        {refreshing ? <p role="status">Updating installed extensions…</p> : null}
      </header>
      {populatedSections.length ? (
        populatedSections.map((section) => (
          <InstalledSection
            key={section.id}
            section={section}
            onOpenProject={onOpenProject}
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
