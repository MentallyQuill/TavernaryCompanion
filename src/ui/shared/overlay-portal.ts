export function resolveOverlayPortalTarget(source: Element | null): Element {
  return source?.closest("dialog[open]") ?? document.body;
}
