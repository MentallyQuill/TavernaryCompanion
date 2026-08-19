import type { CompanionRoute } from "./shell-state";

const routes: Array<{ id: CompanionRoute; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "kits", label: "Kits" },
  { id: "installed", label: "Installed" },
];

interface RouteTabsProps {
  route: CompanionRoute;
  onNavigate(route: CompanionRoute): void;
}

export function RouteTabs({ route, onNavigate }: RouteTabsProps): preact.JSX.Element {
  return (
    <nav class="tavernary-companion-shell__tabs" aria-label="Companion sections">
      <div role="tablist">
        {routes.map((candidate) => (
          <button
            type="button"
            role="tab"
            aria-selected={candidate.id === route}
            tabIndex={candidate.id === route ? 0 : -1}
            onClick={() => onNavigate(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
      </div>
      <label class="tavernary-companion-route-select">
        <span>Browse</span>
        <select
          aria-label="Browse Companion"
          value={route}
          onChange={(event) => onNavigate(event.currentTarget.value as CompanionRoute)}
        >
          {routes.map((candidate) => (
            <option value={candidate.id}>{candidate.label}</option>
          ))}
        </select>
      </label>
    </nav>
  );
}
