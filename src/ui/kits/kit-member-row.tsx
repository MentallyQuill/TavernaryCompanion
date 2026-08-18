export function KitMemberRow({
  id,
  name,
  first,
  last,
  onMove,
  onRemove,
}: {
  id: string;
  name: string;
  first: boolean;
  last: boolean;
  onMove(direction: -1 | 1): void;
  onRemove(): void;
}): preact.JSX.Element {
  return (
    <li data-project-id={id}>
      <span>{name}</span>
      <div>
        <button
          type="button"
          disabled={first}
          aria-label={`Move ${name} up`}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={last}
          aria-label={`Move ${name} down`}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button type="button" aria-label={`Remove ${name}`} onClick={onRemove}>
          Remove
        </button>
      </div>
    </li>
  );
}
