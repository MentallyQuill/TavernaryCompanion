import type { KitComponentViewModel } from "../../kits/kit-view-model";

export function KitComponentGroup({
  title,
  components,
}: {
  title: string;
  components: readonly KitComponentViewModel[];
}): preact.JSX.Element | null {
  if (!components.length) return null;
  return (
    <section class="tavernary-companion-kit-components">
      <h3>{title}</h3>
      <ul>
        {components.map((component) => (
          <li key={component.projectId}>
            <div>
              <strong>{component.name}</strong>
              <small>{reasonFor(component.group)}</small>
              <span class={`is-${statusKind(component)}`}>
                {component.available ? "Available" : "Unavailable"}
                {component.assessment ? ` · ${component.assessment} concern` : ""}
              </span>
            </div>
            {component.canonicalUrl ? (
              <a
                href={component.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${component.name} project`}
              >
                Open <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function statusKind(component: KitComponentViewModel): "available" | "attention" | "unavailable" {
  if (!component.available) return "unavailable";
  if (component.assessment && component.assessment !== "low") return "attention";
  return "available";
}

function reasonFor(group: KitComponentViewModel["group"]): string {
  return {
    managed: "Eligible for Companion Kit actions.",
    external: "Installed outside Companion management.",
    context: "Included as context; Companion does not manage it.",
    unavailable: "Unavailable or changed in the current catalog.",
  }[group];
}
