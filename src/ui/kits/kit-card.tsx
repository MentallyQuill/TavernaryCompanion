import type { KitCardViewModel, KitPrimaryAction } from "../../kits/kit-view-model";

export function KitCard({
  kit,
  disabled,
  onOpen,
  onAction,
}: {
  kit: KitCardViewModel;
  disabled?: boolean;
  onOpen(): void;
  onAction(action: KitPrimaryAction): void;
}): preact.JSX.Element {
  return (
    <article class="tavernary-companion-kit-card" data-kit-id={kit.id}>
      <header>
        <h3>{kit.title}</h3>
        <span>{kit.originLabel}</span>
      </header>
      <p>{kit.description || "No description provided."}</p>
      <dl>
        <div>
          <dt>Components</dt>
          <dd>{kit.componentCount}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{kit.operationalStatus}</dd>
        </div>
        {kit.flaggedCount ? (
          <div>
            <dt>Flagged</dt>
            <dd>{kit.flaggedCount}</dd>
          </div>
        ) : null}
      </dl>
      <footer>
        <button type="button" data-focus-key={`kit-${kit.id}`} onClick={onOpen}>
          Details
        </button>
        <button
          type="button"
          class="tavernary-companion-kit-card__primary"
          disabled={disabled}
          onClick={() => onAction(kit.primaryAction)}
        >
          {kit.primaryAction.label}
        </button>
      </footer>
    </article>
  );
}
