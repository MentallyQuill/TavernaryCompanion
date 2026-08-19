import { CategoryIcon } from "../shared/category-icon";

export function KitMemberRow({
  id,
  name,
  kind = "extension",
  onDragStart,
  onMove,
  onRemove,
}: {
  id: string;
  name: string;
  kind?: string;
  onDragStart(event: preact.JSX.TargetedPointerEvent<HTMLButtonElement>): void;
  onMove(direction: -1 | 1): void;
  onRemove(): void;
}): preact.JSX.Element {
  return (
    <li class="tavernary-companion-kit-builder-row" data-project-id={id} data-kind={kind}>
      <button
        type="button"
        class="tavernary-companion-kit-drag-handle"
        aria-label={`Drag ${name} to reorder`}
        onPointerDown={onDragStart}
        onKeyDown={(event) => {
          if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
          event.preventDefault();
          onMove(event.key === "ArrowUp" ? -1 : 1);
        }}
      >
        <CategoryIcon name="drag-handle" />
      </button>
      <span class="tavernary-companion-kit-builder-row__identity">
        <strong>{name}</strong>
        <small>{kind}</small>
      </span>
      <button
        type="button"
        class="tavernary-companion-kit-builder-remove"
        aria-label={`Remove ${name} from Kit`}
        aria-pressed="true"
        onClick={onRemove}
      >
        <span aria-hidden="true">−</span>
      </button>
    </li>
  );
}
