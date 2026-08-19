import { useId } from "preact/hooks";

import type { ProjectPrimaryAction } from "../../catalog/project-view-model";
import { InstallIcon } from "../shared/install-icon";

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
      <button
        type="button"
        class={`tavernary-companion-project-lifecycle${installed ? " is-installed" : ""}`}
        data-testid="project-lifecycle-action"
        aria-label={label}
        aria-describedby={disabled ? disabledReasonId : undefined}
        aria-pressed={installed}
        title={action.label}
        disabled={disabled}
        onClick={() => onAction(action)}
      >
        <span class="tavernary-companion-project-lifecycle__face" aria-hidden="true">
          <InstallIcon />
        </span>
      </button>
      {disabled ? (
        <span id={disabledReasonId} class="tavernary-companion-sr-only">
          Another Companion operation is in progress.
        </span>
      ) : null}
    </>
  );
}
