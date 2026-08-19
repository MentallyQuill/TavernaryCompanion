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
  if (action.kind !== "install" && action.kind !== "uninstall") return null;
  const installed = action.kind === "uninstall";
  const label = `${action.label} ${projectName}`;
  return (
    <button
      type="button"
      class={`tavernary-companion-project-lifecycle${installed ? " is-installed" : ""}`}
      data-testid="project-lifecycle-action"
      aria-label={label}
      aria-pressed={installed}
      title={action.reason ? `${label} — ${action.reason}` : label}
      disabled={disabled}
      onClick={() => onAction(action)}
    >
      <InstallIcon />
    </button>
  );
}
