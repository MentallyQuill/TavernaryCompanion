import { useLayoutEffect, useRef, useState } from "preact/hooks";

import { FilterChoice } from "./filter-choice";

export interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface FilterGroupProps {
  title: string;
  options: readonly FilterOption[];
  selected: readonly string[];
  onToggle(id: string): void;
  presentation?: "list" | "chips";
  searchLabel?: string;
  initialVisibleCount?: number;
  kindColors?: boolean;
  countNoun?: string;
  selectionMode?: "multiple" | "single";
}

export function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  presentation = "list",
  searchLabel,
  initialVisibleCount = options.length,
  kindColors = false,
  countNoun = "project",
  selectionMode = "multiple",
}: FilterGroupProps): preact.JSX.Element | null {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [chipsOverflow, setChipsOverflow] = useState(false);
  const chipListRef = useRef<HTMLDivElement>(null);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const pinned = options.slice(0, initialVisibleCount);
  const selectedExtras = options.filter(
    (option, index) => index >= initialVisibleCount && selected.includes(option.id),
  );
  const collapsedIds = new Set([...pinned, ...selectedExtras].map(({ id }) => id));
  const collapsedOptions = options.filter(({ id }) => collapsedIds.has(id));
  const visibleOptions = normalizedSearch
    ? options.filter(({ label }) => label.toLocaleLowerCase().includes(normalizedSearch))
    : expanded
      ? options
      : collapsedOptions;
  const hiddenCount = options.length - collapsedOptions.length;

  useLayoutEffect(() => {
    if (presentation !== "chips" || !chipListRef.current) return;
    const list = chipListRef.current;
    const measure = () => {
      const rowCount = new Set(
        Array.from(list.children).map((child) => Math.round((child as HTMLElement).offsetTop)),
      ).size;
      setChipsOverflow(rowCount > 4);
    };
    if (typeof ResizeObserver === "undefined") {
      measure();
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    measure();
    return () => observer.disconnect();
  }, [expanded, options, presentation, selected]);

  if (options.length === 0) return null;

  return (
    <fieldset class="tavernary-companion-filter-group">
      <legend>{title}</legend>
      {searchLabel ? (
        <input
          class="tavernary-companion-filter-search"
          type="search"
          value={search}
          placeholder="Search…"
          aria-label={searchLabel}
          onInput={(event) => setSearch(event.currentTarget.value)}
        />
      ) : null}
      <div
        ref={presentation === "chips" ? chipListRef : undefined}
        class={`tavernary-companion-filter-options tavernary-companion-filter-options--${presentation}${presentation === "chips" && !expanded ? " is-collapsed" : ""}`}
      >
        {visibleOptions.map((option) =>
          presentation === "chips" ? (
            <FilterChoice
              key={option.id}
              label={option.label}
              count={option.count}
              checked={selected.includes(option.id)}
              onChange={() => onToggle(option.id)}
            />
          ) : (
            <label key={option.id} class="tavernary-companion-filter-option">
              <input
                type={selectionMode === "single" ? "radio" : "checkbox"}
                name={selectionMode === "single" ? `filter-${title}` : undefined}
                aria-label={option.label}
                checked={selected.includes(option.id)}
                class={kindColors ? "tavernary-companion-kind-checkbox" : undefined}
                data-kind={kindColors ? option.id : undefined}
                onChange={() => onToggle(option.id)}
              />
              <span>{option.label}</span>
              <b aria-label={`${option.count} ${option.count === 1 ? countNoun : `${countNoun}s`}`}>
                {option.count}
              </b>
            </label>
          ),
        )}
      </div>
      {presentation === "list" && !normalizedSearch && (hiddenCount > 0 || expanded) ? (
        <button
          class="tavernary-companion-filter-disclosure"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      ) : null}
      {presentation === "chips" && (chipsOverflow || expanded) ? (
        <button
          class="tavernary-companion-filter-disclosure tavernary-companion-metadata-disclosure"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : "Show more"}
        </button>
      ) : null}
    </fieldset>
  );
}
