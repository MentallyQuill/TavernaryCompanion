import { useId } from "preact/hooks";

import { Tooltip } from "../shared/tooltip";

interface ProjectKitControlProps {
  projectId: string;
  projectName: string;
  selected: boolean;
  compact?: boolean;
  onToggle(projectId: string): void;
}

export function ProjectKitControl({
  projectId,
  projectName,
  selected,
  compact = false,
  onToggle,
}: ProjectKitControlProps): preact.JSX.Element {
  const tooltipId = useId();
  const tooltipLabel = selected ? "Remove from selection" : "Add to Kit";
  return (
    <Tooltip
      id={`${tooltipId}-kit-action-tooltip`}
      label={tooltipLabel}
      className="tavernary-companion-control-tooltip"
    >
      <button
        type="button"
        class="tavernary-companion-project-kit-control"
        aria-label={selected ? `Remove ${projectName} from selection` : `Add ${projectName} to Kit`}
        aria-pressed={selected}
        onClick={() => onToggle(projectId)}
      >
        <span class="tavernary-companion-project-kit-control__face" aria-hidden="true">
          <svg
            data-kit-glyph={selected ? "remove" : "add"}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d={selected ? "M1.5 6h9" : "M6 1.5v9M1.5 6h9"} />
          </svg>
          {compact ? null : <small>Kit</small>}
        </span>
      </button>
    </Tooltip>
  );
}
