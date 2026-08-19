interface FilterChoiceProps {
  label: string;
  count: number;
  checked: boolean;
  onChange(): void;
  title?: string;
  class?: string;
}

export function FilterChoice({
  label,
  count,
  checked,
  onChange,
  title,
  class: className,
}: FilterChoiceProps): preact.JSX.Element {
  return (
    <label
      class={`tavernary-companion-filter-choice${checked ? " is-selected" : ""}${className ? ` ${className}` : ""}`}
      title={title}
    >
      <span class="tavernary-companion-filter-choice__chip">
        <input
          class="tavernary-companion-filter-choice__input"
          type="checkbox"
          aria-label={label}
          checked={checked}
          onChange={onChange}
        />
        <span class="tavernary-companion-filter-choice__check" aria-hidden="true">
          ✓
        </span>
        <span>{label}</span>
        <b
          class="tavernary-companion-filter-choice__count"
          aria-label={`${count} ${count === 1 ? "project" : "projects"}`}
        >
          {count}
        </b>
      </span>
    </label>
  );
}
