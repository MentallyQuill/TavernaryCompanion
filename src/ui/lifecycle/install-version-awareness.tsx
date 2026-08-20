import { createPortal } from "preact/compat";
import { useCallback, useEffect, useRef } from "preact/hooks";

import type { PreparedInstallSelection } from "../../lifecycle/lifecycle-coordinator";
import { resolveOverlayPortalTarget } from "../shared/overlay-portal";

interface InstallVersionAwarenessProps {
  projectId: string;
  projectName: string;
  anchor: HTMLElement;
  selection: PreparedInstallSelection;
  onConfirm(selection: PreparedInstallSelection): void;
  onCancel(): void;
}

export function InstallVersionAwareness({
  projectId,
  projectName,
  anchor,
  selection,
  onConfirm,
  onCancel,
}: InstallVersionAwarenessProps): preact.JSX.Element | null {
  const surfaceRef = useRef<HTMLElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const settled = useRef(false);
  const headingId = `install-latest-${projectId}-heading`;

  const restoreFocus = useCallback(() => {
    if (anchor.isConnected) anchor.focus({ preventScroll: true });
  }, [anchor]);

  const cancel = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
    restoreFocus();
    queueMicrotask(restoreFocus);
  }, [onCancel, restoreFocus]);

  const confirm = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    restoreFocus();
    onConfirm(selection);
  }, [onConfirm, restoreFocus, selection]);

  useEffect(() => {
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = surfaceRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!surfaceRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", dismissEscape, true);
    document.addEventListener("keydown", containFocus, true);
    confirmRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", dismissEscape, true);
      document.removeEventListener("keydown", containFocus, true);
    };
  }, [cancel]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      class="tavernary-companion-install-version-chooser-backdrop is-awareness"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <section
        ref={surfaceRef}
        class="tavernary-companion-install-version-chooser tavernary-companion-install-version-awareness"
        role="dialog"
        aria-labelledby={headingId}
        aria-modal="true"
        data-project-name={projectName}
      >
        <h2 id={headingId}>Install latest from creator?</h2>
        <p>This installs the creator’s latest version.</p>
        <p>TavernKeeper has not scanned this exact version.</p>
        <div class="tavernary-companion-install-version-awareness__actions">
          <button type="button" onClick={cancel}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" onClick={confirm}>
            Install latest
          </button>
        </div>
      </section>
    </div>,
    resolveOverlayPortalTarget(anchor),
  );
}
