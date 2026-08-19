import { createPortal } from "preact/compat";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import type { LifecycleReceipt } from "../../lifecycle/operation-receipt";

const DISPLAY_DURATION_MS = 4_500;
const VIEWPORT_MARGIN = 8;
const PANEL_GAP = 8;

interface OperationSuccessNotificationProps {
  receipt: LifecycleReceipt;
  onDismiss?(): void;
}

export function OperationSuccessNotification({
  receipt,
  onDismiss,
}: OperationSuccessNotificationProps): preact.JSX.Element | null {
  const notificationRef = useRef<HTMLElement>(null);
  const dismissRef = useRef(onDismiss);
  const timerRef = useRef<number | null>(null);
  const timerStartedAtRef = useRef(0);
  const remainingDurationRef = useRef(DISPLAY_DURATION_MS);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);
  const [position, setPosition] = useState<preact.JSX.CSSProperties>({
    visibility: "hidden",
  });

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  const clearDismissTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startDismissTimer = useCallback(() => {
    if (timerRef.current !== null || remainingDurationRef.current <= 0) return;
    timerStartedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      remainingDurationRef.current = 0;
      dismissRef.current?.();
    }, remainingDurationRef.current);
  }, []);

  const pauseDismissTimer = useCallback(() => {
    if (timerRef.current === null) return;
    remainingDurationRef.current = Math.max(
      0,
      remainingDurationRef.current - (Date.now() - timerStartedAtRef.current),
    );
    clearDismissTimer();
  }, [clearDismissTimer]);

  const resumeDismissTimer = useCallback(() => {
    if (pointerInsideRef.current || focusInsideRef.current) return;
    startDismissTimer();
  }, [startDismissTimer]);

  useEffect(() => {
    remainingDurationRef.current = DISPLAY_DURATION_MS;
    pointerInsideRef.current = false;
    focusInsideRef.current = false;
    startDismissTimer();
    return clearDismissTimer;
  }, [clearDismissTimer, receipt.id, startDismissTimer]);

  useLayoutEffect(() => {
    const panel = document.querySelector<HTMLElement>(".tavernary-companion-root");
    if (!panel) return;
    panel.dataset.operationNotificationActive = "";
    return () => {
      delete panel.dataset.operationNotificationActive;
    };
  }, [receipt.id]);

  useLayoutEffect(() => {
    const notification = notificationRef.current;
    const panel = document.querySelector<HTMLElement>(".tavernary-companion-root");
    if (!notification || !panel) {
      setPosition({
        insetBlockStart: `${VIEWPORT_MARGIN}px`,
        insetInlineStart: "50%",
        maxInlineSize: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        visibility: "visible",
      });
      return;
    }

    const updatePosition = () => {
      const panelRect = panel.getBoundingClientRect();
      const notificationRect = notification.getBoundingClientRect();
      const maxInlineSize = Math.max(
        0,
        Math.min(
          520,
          panelRect.width - VIEWPORT_MARGIN * 2,
          window.innerWidth - VIEWPORT_MARGIN * 2,
        ),
      );
      setPosition({
        insetBlockStart: `${Math.max(
          VIEWPORT_MARGIN,
          panelRect.top - notificationRect.height - PANEL_GAP,
        )}px`,
        insetInlineStart: `${panelRect.left + panelRect.width / 2}px`,
        maxInlineSize: `${maxInlineSize}px`,
        visibility: "visible",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    resizeObserver?.observe(panel);
    resizeObserver?.observe(notification);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [receipt.id]);

  if (typeof document === "undefined") return null;

  const title = successTitle(receipt);
  const detail = successDetail(receipt);
  const statusLabel = receipt.kind === "install" ? "Installation complete" : "Removal complete";

  return createPortal(
    <aside
      ref={notificationRef}
      class="tavernary-companion-operation-notification"
      role="status"
      aria-label={statusLabel}
      aria-live="polite"
      aria-atomic="true"
      style={position}
    >
      <button
        class="tavernary-companion-operation-notification__button"
        type="button"
        aria-label={`Dismiss notification: ${title}. ${detail}`}
        onClick={onDismiss}
        onPointerEnter={() => {
          pointerInsideRef.current = true;
          pauseDismissTimer();
        }}
        onPointerLeave={() => {
          pointerInsideRef.current = false;
          resumeDismissTimer();
        }}
        onFocus={() => {
          focusInsideRef.current = true;
          pauseDismissTimer();
        }}
        onBlur={() => {
          focusInsideRef.current = false;
          resumeDismissTimer();
        }}
      >
        <span class="tavernary-companion-operation-notification__mark" aria-hidden="true">
          ✓
        </span>
        <span class="tavernary-companion-operation-notification__copy">
          <strong>{title}</strong>
          <span>{detail}</span>
        </span>
        <span class="tavernary-companion-operation-notification__dismiss" aria-hidden="true">
          ×
        </span>
      </button>
    </aside>,
    document.body,
  );
}

function successTitle(receipt: LifecycleReceipt): string {
  if (receipt.kind === "install" && receipt.installProvenance?.targetKind === "checked") {
    return "Installed the checked version.";
  }
  if (receipt.kind === "install" && receipt.installProvenance?.targetKind === "newest") {
    return "Installed the newest version.";
  }
  return `${receipt.projectName} ${receipt.kind === "install" ? "installed" : "removed"}`;
}

function successDetail(receipt: LifecycleReceipt): string {
  if (receipt.kind === "install") {
    return receipt.reloadRequired
      ? "Verified in SillyTavern · Reload to finish installation"
      : "Verified in SillyTavern · Managed by Companion";
  }
  return receipt.reloadRequired
    ? "Verified removed · Reload to finish"
    : "Verified removed from SillyTavern";
}
