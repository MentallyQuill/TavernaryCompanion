interface ShellHeaderProps {
  onRequestClose?: () => void;
}

export function ShellHeader({ onRequestClose }: ShellHeaderProps): preact.JSX.Element {
  return (
    <header class="tavernary-companion-shell__header">
      <div>
        <span class="tavernary-companion-shell__eyebrow">Tavernary</span>
        <h1 id="tavernary-companion-heading">Tavernary Companion</h1>
      </div>
      {onRequestClose ? (
        <button type="button" onClick={onRequestClose} aria-label="Close Tavernary Companion">
          Close
        </button>
      ) : null}
    </header>
  );
}
