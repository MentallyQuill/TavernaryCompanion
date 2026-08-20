import type { InstalledKitViewModel } from "../../kits/kit-view-model";

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
  const count = kit.selectionProjectIds.length;
  const noun = count === 1 ? "extension" : "extensions";
  return (
    <article
      class={`tavernary-companion-installed-kit-card${selected ? " is-selected" : ""}${kit.active ? " is-active" : ""}`}
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
        {kit.displayStatus !== "Complete" ? <strong>{kit.displayStatus}</strong> : null}
        {kit.displayStatus === "Drifted" ? <small>Needs review</small> : null}
      </button>
      <div class="tavernary-companion-installed-kit-card__actions">
        {kit.orphaned ? (
          <button type="button" aria-label={`Uninstall ${kit.title}`} onClick={onUninstall}>
            Uninstall Kit
          </button>
        ) : (
          <button type="button" aria-label={`Open ${kit.title}`} onClick={onOpen}>
            View Kit
          </button>
        )}
      </div>
    </article>
  );
}
