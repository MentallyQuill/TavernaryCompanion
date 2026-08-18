import type { KitQuery } from "../../catalog/catalog-core";

export function KitFilterPanel({
  query,
  onChange,
}: {
  query: KitQuery;
  onChange(query: KitQuery): void;
}): preact.JSX.Element {
  const update = (change: Partial<KitQuery>) => onChange({ ...query, ...change });
  return (
    <fieldset class="tavernary-companion-kit-filters">
      <legend>Published Kit filters</legend>
      <label>
        Frontend{" "}
        <input
          value={query.frontends.join(", ")}
          onInput={(event) => update({ frontends: split(event.currentTarget.value) })}
        />
      </label>
      <label>
        Purpose{" "}
        <input
          value={query.purposes.join(", ")}
          onInput={(event) => update({ purposes: split(event.currentTarget.value) })}
        />
      </label>
      <label>
        Model family{" "}
        <input
          value={(query.modelFamilies ?? []).join(", ")}
          onInput={(event) => update({ modelFamilies: split(event.currentTarget.value) })}
        />
      </label>
      <label>
        Includes project{" "}
        <input
          value={query.includesProjectId}
          onInput={(event) => update({ includesProjectId: event.currentTarget.value.trim() })}
        />
      </label>
      <label>
        Minimum components{" "}
        <input
          type="number"
          min="0"
          max="50"
          value={query.minProjects}
          onInput={(event) => update({ minProjects: event.currentTarget.valueAsNumber || 0 })}
        />
      </label>
      <label>
        Maximum components{" "}
        <input
          type="number"
          min="1"
          max="100"
          value={query.maxProjects}
          onInput={(event) => update({ maxProjects: event.currentTarget.valueAsNumber || 50 })}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={query.allComponentsAvailable}
          onChange={(event) => update({ allComponentsAvailable: event.currentTarget.checked })}
        />{" "}
        All components available
      </label>
      <label>
        Sort{" "}
        <select
          value={query.sort}
          onChange={(event) => update({ sort: event.currentTarget.value as KitQuery["sort"] })}
        >
          <option value="trending">Trending</option>
          <option value="newest">Newest</option>
          <option value="updated">Recently updated</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="relevance">Relevance</option>
        </select>
      </label>
    </fieldset>
  );
}
function split(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
