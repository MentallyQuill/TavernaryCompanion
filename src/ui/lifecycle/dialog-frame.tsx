import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

interface DialogFrameProps {
  label: string;
  className?: string;
  onCancel(): void;
  children: ComponentChildren;
}

export function DialogFrame({
  label,
  className = "",
  onCancel,
  children,
}: DialogFrameProps): preact.JSX.Element {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controls = dialog.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]',
    );
    controls?.[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !controls || controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);
  return (
    <div class="tavernary-companion-dialog-backdrop">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        class={`tavernary-companion-dialog ${className}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
