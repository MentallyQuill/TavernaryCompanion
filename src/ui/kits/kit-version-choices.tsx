import type { KitInstallStep } from "../../kits/kit-plan";
import type { KitInstallTargetSelection } from "../../kits/kit-install-targets";
import { sameInstallTarget } from "../../kits/kit-install-targets";
import type { InstallTarget } from "../../lifecycle/install-target";
import { checkedVersionDescription } from "../lifecycle/install-version-chooser";

export function KitVersionChoices({
  steps,
  selections,
  onChange,
}: {
  steps: readonly KitInstallStep[];
  selections: readonly KitInstallTargetSelection[];
  onChange(projectId: string, target: InstallTarget): void;
}): preact.JSX.Element | null {
  if (!steps.length) return null;
  const selected = new Map(selections.map((selection) => [selection.projectId, selection.target]));
  return (
    <section class="tavernary-companion-kit-version-choices" aria-labelledby="kit-versions-heading">
      <h3 id="kit-versions-heading">Install</h3>
      <p>Choose a version for each project that has two options.</p>
      {steps.map((step) => (
        <ProjectVersionChoice
          key={step.projectId}
          step={step}
          selected={selected.get(step.projectId) ?? null}
          onChange={(target) => onChange(step.projectId, target)}
        />
      ))}
    </section>
  );
}

function ProjectVersionChoice({
  step,
  selected,
  onChange,
}: {
  step: KitInstallStep;
  selected: InstallTarget | null;
  onChange(target: InstallTarget): void;
}): preact.JSX.Element {
  const choice = step.targetChoice;
  if (!choice) {
    return (
      <section class="tavernary-companion-kit-version-choice" role="status">
        <strong>{step.projectName}</strong>
        <span>We couldn't find the newest version. Try again.</span>
      </section>
    );
  }
  if (choice.kind === "single") {
    return (
      <section class="tavernary-companion-kit-version-choice">
        <strong>{step.projectName}</strong>
        <span>{targetLabel(choice.target)}</span>
        <small>{targetDescription(choice.target)}</small>
      </section>
    );
  }
  const checkedDescriptionId = `kit-version-${step.projectId}-checked-description`;
  const checkedDisabledId = `kit-version-${step.projectId}-checked-disabled`;
  const newestDescriptionId = `kit-version-${step.projectId}-newest-description`;
  return (
    <fieldset class="tavernary-companion-kit-version-choice">
      <legend>{step.projectName}</legend>
      <label>
        <input
          type="radio"
          name={`kit-version-${step.projectId}`}
          aria-label={`Checked version for ${step.projectName}`}
          aria-describedby={
            choice.checked.disabledReason
              ? `${checkedDescriptionId} ${checkedDisabledId}`
              : checkedDescriptionId
          }
          checked={Boolean(selected && sameInstallTarget(selected, choice.checked.target))}
          disabled={choice.checked.disabledReason !== null}
          onChange={() => onChange(choice.checked.target)}
        />
        <span>
          <strong>Checked version</strong>
          <small id={checkedDescriptionId}>
            {checkedVersionDescription(choice.checked.target.checkedAt)}
          </small>
          {choice.checked.disabledReason ? (
            <small id={checkedDisabledId}>{choice.checked.disabledReason}</small>
          ) : null}
        </span>
      </label>
      <label>
        <input
          type="radio"
          name={`kit-version-${step.projectId}`}
          aria-label={`Newest version for ${step.projectName}`}
          aria-describedby={newestDescriptionId}
          checked={Boolean(selected && sameInstallTarget(selected, choice.newest))}
          onChange={() => onChange(choice.newest)}
        />
        <span>
          <strong>Newest version</strong>
          <small id={newestDescriptionId}>{targetDescription(choice.newest)}</small>
        </span>
      </label>
    </fieldset>
  );
}

function targetLabel(target: InstallTarget): string {
  return target.kind === "checked" ? "Checked version" : "Newest version";
}

function targetDescription(target: InstallTarget): string {
  return target.kind === "checked"
    ? checkedVersionDescription(target.checkedAt)
    : "The latest version from the creator. It may include changes TavernKeeper hasn't checked yet.";
}
