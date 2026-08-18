import {
  CATEGORY_OPTIONS,
  type CatalogKind,
  type CatalogQuery,
  type CatalogView,
  type DevelopmentFilter,
  type LicenseFilter,
} from "../../catalog/catalog-core";

export interface FilterFacet {
  id: string;
  label: string;
}

export interface ProjectFacets {
  frontends: FilterFacet[];
  tags: FilterFacet[];
}

interface FilterPanelProps {
  query: CatalogQuery;
  facets: ProjectFacets;
  onQueryChange(query: CatalogQuery): void;
}

const kinds: Array<FilterFacet & { id: CatalogKind }> = [
  { id: "frontend", label: "Frontend" },
  { id: "extension", label: "Extension" },
  { id: "preset", label: "Preset" },
];
const models: FilterFacet[] = [
  { id: "model-agnostic", label: "Model agnostic" },
  { id: "claude", label: "Claude" },
  { id: "gpt", label: "GPT" },
  { id: "gemini", label: "Gemini" },
  { id: "gemma", label: "Gemma" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "glm", label: "GLM" },
  { id: "minimax", label: "MiniMax" },
  { id: "mimo", label: "MiMo" },
  { id: "kimi", label: "Kimi" },
  { id: "qwen", label: "Qwen" },
  { id: "llama", label: "Llama" },
  { id: "mistral", label: "Mistral" },
];
const completion: FilterFacet[] = [
  { id: "chat-completion", label: "Chat completion" },
  { id: "text-completion", label: "Text completion" },
];
const development: Array<FilterFacet & { id: DevelopmentFilter }> = [
  { id: "active-month", label: "Active this month" },
  { id: "new-release", label: "New release" },
  { id: "dormant", label: "Dormant" },
];
const licenses: Array<FilterFacet & { id: LicenseFilter }> = [
  { id: "open-source", label: "Open source" },
  { id: "proprietary", label: "Proprietary" },
  { id: "missing", label: "Missing license" },
  { id: "pending", label: "License pending" },
];
const views: Array<FilterFacet & { id: CatalogView }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "new", label: "New" },
  { id: "released", label: "Recently released" },
];

export function FilterPanel({
  query,
  facets,
  onQueryChange,
}: FilterPanelProps): preact.JSX.Element {
  return (
    <aside class="tavernary-companion-filter-panel" aria-label="Project filters">
      <fieldset>
        <legend>Category</legend>
        <select
          aria-label="Category"
          value={query.category}
          onChange={(event) => onQueryChange({ ...query, category: event.currentTarget.value })}
        >
          {CATEGORY_OPTIONS.map(({ id, label }) => (
            <option value={id}>{label}</option>
          ))}
        </select>
      </fieldset>
      <CheckboxGroup
        label="Frontends"
        options={facets.frontends}
        selected={query.frontends}
        onChange={(frontends) => onQueryChange({ ...query, frontends })}
      />
      <CheckboxGroup
        label="Project type"
        options={kinds}
        selected={query.kinds}
        onChange={(kinds) => onQueryChange({ ...query, kinds: kinds as CatalogKind[] })}
      />
      <CheckboxGroup
        label="Tags"
        options={facets.tags}
        selected={query.tags}
        onChange={(tags) => onQueryChange({ ...query, tags })}
      />
      <CheckboxGroup
        label="Models"
        options={models}
        selected={query.modelFamilies ?? []}
        onChange={(modelFamilies) => onQueryChange({ ...query, modelFamilies })}
      />
      <CheckboxGroup
        label="Completion"
        options={completion}
        selected={query.completionFormats ?? []}
        onChange={(completionFormats) => onQueryChange({ ...query, completionFormats })}
      />
      <CheckboxGroup
        label="Development"
        options={development}
        selected={query.development}
        onChange={(values) =>
          onQueryChange({ ...query, development: values as DevelopmentFilter[] })
        }
      />
      <CheckboxGroup
        label="License"
        options={licenses}
        selected={query.licenses}
        onChange={(values) => onQueryChange({ ...query, licenses: values as LicenseFilter[] })}
      />
      <fieldset>
        <legend>Catalog view</legend>
        {views.map(({ id, label }) => (
          <label>
            <input
              type="radio"
              name="catalog-view"
              checked={query.view === id}
              onChange={() => onQueryChange({ ...query, view: id })}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </aside>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterFacet[];
  selected: string[];
  onChange(values: string[]): void;
}): preact.JSX.Element {
  return (
    <fieldset>
      <legend>{label}</legend>
      {options.length === 0 ? <span>None available</span> : null}
      {options.map(({ id, label: optionLabel }) => (
        <label>
          <input
            type="checkbox"
            checked={selected.includes(id)}
            onChange={() => onChange(toggle(selected, id))}
          />
          {optionLabel}
        </label>
      ))}
    </fieldset>
  );
}

function toggle(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}
