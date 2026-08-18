import type { KitPlan, KitProjectStep } from "../../kits/kit-plan";

const groups: Array<{
  key: keyof Pick<
    KitPlan,
    | "install"
    | "enable"
    | "disable"
    | "remove"
    | "alreadyManaged"
    | "externalContext"
    | "contextOnly"
    | "keptForOtherKits"
  >;
  title: string;
}> = [
  { key: "install", title: "Install" },
  { key: "enable", title: "Enable" },
  { key: "disable", title: "Disable" },
  { key: "remove", title: "Remove" },
  { key: "alreadyManaged", title: "Already managed" },
  { key: "externalContext", title: "External, unchanged" },
  { key: "contextOnly", title: "Context only" },
  { key: "keptForOtherKits", title: "Kept for other Kits" },
];

export function KitImpactSummary({ plan }: { plan: Readonly<KitPlan> }): preact.JSX.Element {
  return (
    <div class="tavernary-companion-kit-impact">
      {groups.map(({ key, title }) => (
        <ImpactGroup key={key} title={title} steps={plan[key]} />
      ))}
      {plan.blockingIssues.length ? (
        <section>
          <h3>Cannot continue</h3>
          <ul>
            {plan.blockingIssues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
function ImpactGroup({
  title,
  steps,
}: {
  title: string;
  steps: readonly KitProjectStep[];
}): preact.JSX.Element | null {
  return steps.length ? (
    <section>
      <h3>{title}</h3>
      <ul>
        {steps.map((step) => (
          <li key={step.projectId}>{step.projectName}</li>
        ))}
      </ul>
    </section>
  ) : null;
}
