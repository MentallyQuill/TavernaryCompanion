export function KitSelectionDock({
  count,
  onAdd,
  onCancel,
}: {
  count: number;
  onAdd(): void;
  onCancel(): void;
}): preact.JSX.Element {
  const projectLabel = `${count} ${count === 1 ? "project" : "projects"}`;
  return (
    <section class="tavernary-companion-kit-selection-dock" aria-label={`${projectLabel} selected`}>
      <div class="tavernary-companion-kit-selection-actions">
        <button type="button" class="tavernary-companion-kit-selection-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          class="tavernary-companion-kit-selection-add"
          aria-label={`Add ${projectLabel} to Kit`}
          disabled={count === 0}
          onClick={onAdd}
        >
          Add to Kit
          <span class="selection-count" aria-hidden="true">
            {count}
          </span>
        </button>
      </div>
    </section>
  );
}
