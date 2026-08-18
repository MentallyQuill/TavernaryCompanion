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
              <span>
                {component.available ? "Available" : "Unavailable"}
                {component.assessment ? ` · ${component.assessment} concern` : ""}
              </span>
            </div>
            {component.canonicalUrl ? (
              <a href={component.canonicalUrl} target="_blank" rel="noreferrer">
                Project
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
