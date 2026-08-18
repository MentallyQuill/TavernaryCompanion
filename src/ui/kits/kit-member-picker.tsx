import type { CatalogProject } from "../../catalog/catalog-core";
import { selectableKitProjects } from "../../kits/kit-draft";

export function KitMemberPicker({
  projects,
  selected,
  onAdd,
}: {
  projects: readonly CatalogProject[];
  selected: readonly string[];
  onAdd(projectId: string): void;
}): preact.JSX.Element {
  const options = selectableKitProjects(projects).filter(({ id }) => !selected.includes(id));
  return (
    <section class="tavernary-companion-kit-member-picker">
      <h3>Add extensions</h3>
      {options.length ? (
        <ul>
          {options.map((project) => (
            <li key={project.id}>
              <span>{project.name}</span>
              <button type="button" onClick={() => onAdd(project.id)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No eligible extensions remain.</p>
      )}
    </section>
  );
}
