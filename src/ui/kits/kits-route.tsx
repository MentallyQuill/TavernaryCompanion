import { useEffect, useState } from "preact/hooks";
import type { KitDiscoveryController } from "../../kits/kit-discovery-controller";
import type { KitPrimaryAction } from "../../kits/kit-view-model";
import { KitCard } from "./kit-card";
import { KitFilterPanel } from "./kit-filter-panel";

export function KitsRoute({
  controller,
  lifecycleDisabled = false,
  onOpenKit,
  onAction,
  onNewKit,
  onImport,
}: {
  controller: KitDiscoveryController;
  lifecycleDisabled?: boolean;
  onOpenKit(id: string): void;
  onAction(id: string, action: KitPrimaryAction): void;
  onNewKit?(): void;
  onImport?(): void;
}): preact.JSX.Element {
  const [state, setState] = useState(controller.read());
  useEffect(() => controller.subscribe(setState), [controller]);
  return (
    <section class="tavernary-companion-kits-route" aria-labelledby="kits-heading">
      <header>
        <div>
          <h2 id="kits-heading">Kits</h2>
          <p>Save, install, and switch extension collections.</p>
        </div>
        <div>
          <button type="button" onClick={onNewKit}>
            New Kit
          </button>
          <button type="button" onClick={onImport}>
            Import
          </button>
        </div>
      </header>
      <div class="tavernary-companion-kit-segments" role="tablist" aria-label="Kit sources">
        <button
          type="button"
          role="tab"
          aria-selected={state.segment === "published"}
          onClick={() => controller.setSegment("published")}
        >
          Published <span>{state.publishedCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.segment === "personal"}
          onClick={() => controller.setSegment("personal")}
        >
          Personal <span>{state.personalCount}</span>
        </button>
      </div>
      <label class="tavernary-companion-kit-search">
        Search Kits
        <input
          type="search"
          value={state.search}
          onInput={(event) => controller.setSearch(event.currentTarget.value)}
        />
      </label>
      {state.segment === "published" ? (
        <KitFilterPanel query={state.query} onChange={(query) => controller.setQuery(query)} />
      ) : null}
      {state.visible.length ? (
        <div class="tavernary-companion-kit-grid">
          {state.visible.map((kit) => (
            <KitCard
              key={`${kit.origin}-${kit.id}`}
              kit={kit}
              disabled={lifecycleDisabled}
              onOpen={() => onOpenKit(kit.id)}
              onAction={(action) => onAction(kit.id, action)}
            />
          ))}
        </div>
      ) : (
        <p>No Kits match the current view.</p>
      )}
    </section>
  );
}
