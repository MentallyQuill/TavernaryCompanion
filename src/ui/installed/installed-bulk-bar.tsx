interface InstalledBulkBarProps {
  count: number;
  disabled?: boolean;
  onAddToKit(): void;
  onUninstall(): void;
  onClear(): void;
}

export function InstalledBulkBar({
  count,
  disabled = false,
  onAddToKit,
  onUninstall,
  onClear,
}: InstalledBulkBarProps): preact.JSX.Element {
  const id = useId();
  return (
    <aside
      class="tavernary-companion-kit-selection-dock tavernary-companion-installed-bulk-bar"
      aria-label="Bulk actions"
    >
      <span class="tavernary-companion-sr-only" role="status" aria-live="polite">
        {count} selected
      </span>
      <div class="tavernary-companion-kit-selection-actions">
        <Tooltip
          id={`${id}-clear`}
          label="Clear the selection and exit selection mode."
          className="tavernary-companion-control-tooltip"
        >
          <button
            type="button"
            class="tavernary-companion-kit-selection-cancel"
            aria-label="Clear selection and exit"
            onClick={onClear}
          >
            Clear
          </button>
        </Tooltip>
        <Tooltip
          id={`${id}-uninstall`}
          label="Review and uninstall the selected extensions."
          className="tavernary-companion-control-tooltip"
        >
          <button
            type="button"
            class="is-danger"
            aria-label="Uninstall selected extensions"
            disabled={disabled || count === 0}
            onClick={onUninstall}
          >
            Uninstall
          </button>
        </Tooltip>
        <Tooltip
          id={`${id}-add-to-kit`}
          label="Create a new Kit or add these extensions to a personal Kit. Ownership does not change."
          className="tavernary-companion-control-tooltip"
        >
          <button
            type="button"
            class="tavernary-companion-kit-selection-add"
            aria-label="Add selected extensions to a Kit"
            disabled={disabled || count === 0}
            onClick={onAddToKit}
          >
            Add to Kit
            <span class="selection-count" aria-hidden="true">
              {count}
            </span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
import { useId } from "preact/hooks";

import { Tooltip } from "../shared/tooltip";
