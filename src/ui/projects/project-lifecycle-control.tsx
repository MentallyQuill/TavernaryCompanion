import { useId } from "preact/hooks";

import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import { InstallIcon, UninstallIcon } from "../shared/install-icon";
import { Tooltip } from "../shared/tooltip";

interface ProjectLifecycleControlProps {
  projectName: string;
  action: ProjectPrimaryAction;
  disabled?: boolean;
  onAction(action: ProjectPrimaryAction): void;
}

export function ProjectLifecycleControl({
  projectName,
  action,
  disabled = false,
  onAction,
}: ProjectLifecycleControlProps): preact.JSX.Element | null {
  const disabledReasonId = useId();
  if (action.kind !== "install" && action.kind !== "uninstall") return null;
  const installed = action.kind === "uninstall";
  const label = `${action.label} ${projectName}`;
  return (
    <>
      <Tooltip
        id={`${disabledReasonId}-lifecycle-action-tooltip`}
        label={action.label}
        className="tavernary-companion-control-tooltip"
      >
        <button
          type="button"
          class={`tavernary-companion-project-lifecycle${installed ? " is-installed" : ""}`}
          data-testid="project-lifecycle-action"
          aria-label={label}
          aria-describedby={disabled ? disabledReasonId : undefined}
          aria-pressed={installed}
          disabled={disabled}
          onClick={() => onAction(action)}
        >
          <span class="tavernary-companion-project-lifecycle__face" aria-hidden="true">
            {installed ? <UninstallIcon /> : <InstallIcon />}
          </span>
        </button>
      </Tooltip>
      {disabled ? (
        <span id={disabledReasonId} class="tavernary-companion-sr-only">
          Another Companion operation is in progress.
        </span>
      ) : null}
    </>
  );
}
