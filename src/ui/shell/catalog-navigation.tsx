import { useEffect, useRef, useState } from "preact/hooks";

import { CATEGORY_OPTIONS, type CatalogQuery } from "../../catalog/catalog-core";
import { CategoryIcon } from "../shared/category-icon";
import type { CompanionRoute } from "./shell-state";

interface CatalogNavigationProps {
  route: CompanionRoute;
  query: CatalogQuery;
  onNavigate(route: CompanionRoute): void;
  onQueryChange(query: CatalogQuery): void;
}

function CategoryMark({ id }: { id: string }): preact.JSX.Element {
  if (!id) {
    return (
      <span class="tavernary-companion-all-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  }
  return <CategoryIcon name={id} />;
}

export function CatalogNavigation({
  route,
  query,
  onNavigate,
  onQueryChange,
}: CatalogNavigationProps): preact.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const mobileMenu = useRef<HTMLDivElement>(null);
  const currentCategory =
    CATEGORY_OPTIONS.find((category) => category.id === query.category) ?? CATEGORY_OPTIONS[0];
  const current =
    route === "kits"
      ? { id: "kits", label: "Kits" }
      : route === "installed"
        ? { id: "installed", label: "Installed" }
        : { id: currentCategory.id, label: currentCategory.label };
  const selectCategory = (category: string) => {
    onNavigate("projects");
    onQueryChange({ ...query, category });
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMobileOpen(false);
      mobileTrigger.current?.focus();
    };
    const closeFromPointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mobileTrigger.current?.contains(target) || mobileMenu.current?.contains(target)) return;
      setMobileOpen(false);
    };
    document.addEventListener("keydown", closeFromKeyboard);
    document.addEventListener("mousedown", closeFromPointer);
    return () => {
      document.removeEventListener("keydown", closeFromKeyboard);
      document.removeEventListener("mousedown", closeFromPointer);
    };
  }, [mobileOpen]);

  const selectRoute = (nextRoute: CompanionRoute) => {
    onNavigate(nextRoute);
    setMobileOpen(false);
  };

  return (
    <>
      <nav class="tavernary-companion-category-navigation" aria-label="Catalog categories">
        <button
          type="button"
          class={route === "kits" ? "active" : ""}
          data-category="kits"
          aria-pressed={route === "kits"}
          onClick={() => selectRoute("kits")}
        >
          <CategoryIcon name="kit" />
          <span>Kits</span>
        </button>
        {CATEGORY_OPTIONS.map((category) => (
          <button
            type="button"
            key={category.id || "all"}
            class={route === "projects" && query.category === category.id ? "active" : ""}
            data-category={category.id || "all"}
            aria-pressed={route === "projects" && query.category === category.id}
            onClick={() => selectCategory(category.id)}
          >
            <CategoryMark id={category.id} />
            <span>{category.shortLabel}</span>
          </button>
        ))}
        <button
          type="button"
          class={route === "installed" ? "active" : ""}
          data-category="installed"
          aria-pressed={route === "installed"}
          onClick={() => selectRoute("installed")}
        >
          <CategoryIcon name="kit-builder" />
          <span>Installed</span>
        </button>
      </nav>

      <div class="tavernary-companion-mobile-category">
        <button
          ref={mobileTrigger}
          class="tavernary-companion-mobile-category__trigger"
          type="button"
          aria-label="Browse categories"
          aria-expanded={mobileOpen}
          data-category={current.id || "all"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <CategoryMark id={current.id} />
          <span>
            <small>Browse</small>
            {current.label}
          </span>
          <CategoryIcon name="chevron" />
        </button>
        {mobileOpen ? (
          <div
            ref={mobileMenu}
            class="tavernary-companion-mobile-category__menu"
            role="group"
            aria-label="Browse categories menu"
          >
            <button
              type="button"
              class={route === "kits" ? "active" : ""}
              data-category="kits"
              onClick={() => selectRoute("kits")}
            >
              <CategoryIcon name="kit" />
              <span>Kits</span>
            </button>
            {CATEGORY_OPTIONS.map((category) => (
              <button
                type="button"
                key={category.id || "all"}
                class={route === "projects" && query.category === category.id ? "active" : ""}
                data-category={category.id || "all"}
                onClick={() => selectCategory(category.id)}
              >
                <CategoryMark id={category.id} />
                <span>{category.label}</span>
              </button>
            ))}
            <button
              type="button"
              class={route === "installed" ? "active" : ""}
              data-category="installed"
              onClick={() => selectRoute("installed")}
            >
              <CategoryIcon name="kit-builder" />
              <span>Installed</span>
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
