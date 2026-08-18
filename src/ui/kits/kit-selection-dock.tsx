export function KitSelectionDock({
  count,
  onReview,
  onCancel,
}: {
  count: number;
  onReview(): void;
  onCancel(): void;
}): preact.JSX.Element {
  return (
    <aside class="tavernary-companion-kit-selection-dock" role="status">
      <span>{count} selected</span>
      <button type="button" disabled={count === 0} onClick={onReview}>
        Review Kit
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </aside>
  );
}
