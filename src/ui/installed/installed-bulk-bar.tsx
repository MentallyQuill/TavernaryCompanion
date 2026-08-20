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
  return (
    <aside class="tavernary-companion-installed-bulk-bar" aria-label="Bulk actions">
      <strong role="status" aria-live="polite">
        {count} selected
      </strong>
      <button
        type="button"
        aria-label="Add selected extensions to a Kit"
        disabled={disabled || count === 0}
        onClick={onAddToKit}
      >
        Add to Kit
      </button>
      <button
        type="button"
        class="is-danger"
        aria-label="Uninstall selected extensions"
        disabled={disabled || count === 0}
        onClick={onUninstall}
      >
        Uninstall
      </button>
      <button type="button" aria-label="Clear selection and exit" onClick={onClear}>
        Clear
      </button>
    </aside>
  );
}
