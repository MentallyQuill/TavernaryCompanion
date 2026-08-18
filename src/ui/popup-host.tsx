import { render } from "preact";

export function CompanionPopupHost(): preact.JSX.Element {
  return (
    <main class="tavernary-companion-shell" aria-label="Tavernary Companion">
      <header class="tavernary-companion-shell__header">
        <div>
          <span class="tavernary-companion-shell__eyebrow">Tavernary</span>
          <h1>Tavernary Companion</h1>
        </div>
      </header>
      <section class="tavernary-companion-shell__content" aria-live="polite">
        Loading catalog…
      </section>
    </main>
  );
}

export function renderCompanionPopup(container: HTMLElement): () => void {
  render(<CompanionPopupHost />, container);
  return () => render(null, container);
}
