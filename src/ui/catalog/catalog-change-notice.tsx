interface CatalogChangeNoticeProps {
  subject: string;
  onReview(): void;
  onDismiss(): void;
}

export function CatalogChangeNotice({
  subject,
  onReview,
  onDismiss,
}: CatalogChangeNoticeProps): preact.JSX.Element {
  return (
    <aside class="tavernary-companion-catalog-change" role="status">
      <p>{subject} changed in the refreshed catalog.</p>
      <button type="button" onClick={onReview}>
        Review changes
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss catalog change notice">
        Dismiss
      </button>
    </aside>
  );
}
