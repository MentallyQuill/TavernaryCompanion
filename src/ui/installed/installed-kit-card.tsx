import type { InstalledKitViewModel } from "../../kits/kit-view-model";
import { useId, useState } from "preact/hooks";
import { Tooltip } from "../shared/tooltip";
import { InstalledStatusHelp } from "./installed-status-help";

interface InstalledKitCardProps {
  kit: InstalledKitViewModel;
  selected: boolean;
  onSelect(): void;
  onOpen(): void;
  onUninstall(): void;
}

export function InstalledKitCard({
  kit,
  selected,
  onSelect,
  onOpen,
  onUninstall,
}: InstalledKitCardProps): preact.JSX.Element {
  const id = useId();
  const [actionsOpen, setActionsOpen] = useState(false);
  const count = kit.selectionProjectIds.length;
  const noun = count === 1 ? "extension" : "extensions";
  return (
    <article
      class={`tavernary-companion-installed-kit-card${selected ? " is-selected" : ""}${kit.active ? " is-active" : ""}`}
    >
      <Tooltip
        id={`${id}-kit-select`}
        label="Select the currently installed extensions in this Kit."
      >
        <button
          type="button"
          class="tavernary-companion-installed-kit-card__select"
          aria-label={`Select ${count} installed ${noun} from ${kit.title}`}
          aria-pressed={selected}
          disabled={count === 0}
          onClick={onSelect}
        >
          <h4>{kit.title}</h4>
          <span>
            {kit.installedCount}/{kit.totalProjectCount} installed
          </span>
          {kit.displayStatus === "Drifted" ? <small>Needs review</small> : null}
        </button>
      </Tooltip>
      {kit.displayStatus !== "Complete" ? <InstalledStatusHelp status={kit.displayStatus} /> : null}
      <div class="tavernary-companion-installed-kit-card__actions">
        <Tooltip id={`${id}-kit-actions`} label={`More actions for ${kit.title}.`}>
          <button
            type="button"
            aria-label={`More actions for ${kit.title}`}
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((current) => !current)}
          >
            <span aria-hidden="true">•••</span>
          </button>
        </Tooltip>
        {actionsOpen ? (
          <div role="menu" aria-label={`${kit.title} actions`}>
            {!kit.orphaned ? (
              <button type="button" role="menuitem" onClick={onOpen}>
                View Kit
              </button>
            ) : null}
            {kit.orphaned ? (
              <button type="button" role="menuitem" class="is-danger" onClick={onUninstall}>
                Uninstall Kit
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
