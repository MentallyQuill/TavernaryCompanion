import { useId, useState } from "preact/hooks";

import type { InstalledKitViewModel } from "../../kits/kit-view-model";
import { Tooltip } from "../shared/tooltip";

type HelpStatus = Exclude<InstalledKitViewModel["displayStatus"], "Complete">;

export const INSTALLED_KIT_STATUS_HELP: Record<HelpStatus, string> = {
  Active: "This Kit currently defines the enabled state for Companion-managed extensions.",
  Partial: "Some extensions in this Kit are not currently installed.",
  Drifted: "Installed or enabled extensions no longer match this Kit's last verified state.",
  Missing: "None of this Kit's extensions are currently installed.",
};

export function InstalledStatusHelp({ status }: { status?: HelpStatus }): preact.JSX.Element {
  const id = useId();
  const [open, setOpen] = useState(false);
  const label = status ? INSTALLED_KIT_STATUS_HELP[status] : "Explain Installed Kit statuses.";
  return (
    <span class={`tavernary-companion-installed-status-help${status ? " is-compact" : ""}`}>
      <Tooltip id={`${id}-tooltip`} label={label}>
        <button
          type="button"
          aria-label={status ? `${status} Kit status help` : "Kit status help"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {status ? <strong>{status}</strong> : "Status help"}
        </button>
      </Tooltip>
      {open ? (
        <span class="tavernary-companion-installed-status-help__panel" role="note">
          {status ? (
            INSTALLED_KIT_STATUS_HELP[status]
          ) : (
            <dl>
              {(Object.entries(INSTALLED_KIT_STATUS_HELP) as Array<[HelpStatus, string]>).map(
                ([name, meaning]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{meaning}</dd>
                  </div>
                ),
              )}
            </dl>
          )}
        </span>
      ) : null}
    </span>
  );
}
