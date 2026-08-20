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
    <aside class="tavernary-companion-installed-bulk-bar" aria-label="Bulk actions">
      <strong role="status" aria-live="polite">
        {count} selected
      </strong>
      <Tooltip
        id={`${id}-add-to-kit`}
        label="Create a new Kit or add these extensions to a personal Kit. Ownership does not change."
        className="tavernary-companion-control-tooltip"
      >
        <button
          type="button"
          aria-label="Add selected extensions to a Kit"
          disabled={disabled || count === 0}
          onClick={onAddToKit}
        >
          Add to Kit
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
        id={`${id}-clear`}
        label="Clear the selection and exit selection mode."
        className="tavernary-companion-control-tooltip"
      >
        <button type="button" aria-label="Clear selection and exit" onClick={onClear}>
          Clear
        </button>
      </Tooltip>
    </aside>
  );
}
import { useId } from "preact/hooks";

import { Tooltip } from "../shared/tooltip";
