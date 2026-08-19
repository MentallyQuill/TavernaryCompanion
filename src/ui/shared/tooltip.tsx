import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import { resolveOverlayPortalTarget } from "./overlay-portal";

const VIEWPORT_MARGIN = 8;
const TOOLTIP_GAP = 8;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function tooltipPosition(trigger: DOMRect, tooltip: DOMRect): preact.JSX.CSSProperties {
  const left = clamp(
    trigger.left + trigger.width / 2 - tooltip.width / 2,
    VIEWPORT_MARGIN,
    window.innerWidth - tooltip.width - VIEWPORT_MARGIN,
  );
  const above = trigger.top - tooltip.height - TOOLTIP_GAP;
  const below = trigger.bottom + TOOLTIP_GAP;
  const preferredTop = above >= VIEWPORT_MARGIN ? above : below;
  const top = clamp(
    preferredTop,
    VIEWPORT_MARGIN,
    window.innerHeight - tooltip.height - VIEWPORT_MARGIN,
  );
  return { left, top };
}

interface TooltipProps {
  id: string;
  label: string;
  children: ComponentChildren;
  className?: string;
  style?: preact.JSX.CSSProperties;
  ariaLabel?: string;
  showOnAncestorFocus?: boolean;
}

export function Tooltip({
  id,
  label,
  children,
  className = "",
  style,
  ariaLabel,
  showOnAncestorFocus = false,
}: TooltipProps): preact.JSX.Element {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<preact.JSX.CSSProperties | null>(null);

  const hide = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  const show = useCallback(() => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!showOnAncestorFocus) return;
    const trigger = triggerRef.current;
    const focusTarget =
      trigger?.closest<HTMLElement>("a, button") ??
      trigger
        ?.closest<HTMLElement>(".tavernary-companion-project-card")
        ?.querySelector<HTMLElement>(".tavernary-companion-project-card__hitarea");
    if (!focusTarget) return;

    focusTarget.addEventListener("focus", show);
    focusTarget.addEventListener("blur", hide);
    return () => {
      focusTarget.removeEventListener("focus", show);
      focusTarget.removeEventListener("blur", hide);
    };
  }, [hide, show, showOnAncestorFocus]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    setPosition(
      tooltipPosition(
        triggerRef.current.getBoundingClientRect(),
        tooltipRef.current.getBoundingClientRect(),
      ),
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const dismissOnMobile = (event: MediaQueryListEvent) => {
      if (event.matches) hide();
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      hide();
    };

    mobileQuery.addEventListener("change", dismissOnMobile);
    document.addEventListener("keydown", dismissOnEscape, true);
    return () => {
      mobileQuery.removeEventListener("change", dismissOnMobile);
      document.removeEventListener("keydown", dismissOnEscape, true);
    };
  }, [hide, open]);

  return (
    <>
      <span
        ref={triggerRef}
        class={`tavernary-companion-tooltip-anchor ${className}`.trim()}
        style={style}
        aria-label={ariaLabel}
        aria-describedby={id}
        role={ariaLabel ? "img" : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocusCapture={show}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hide();
        }}
      >
        {children}
      </span>
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              class="tavernary-companion-tooltip-content"
              id={id}
              role="tooltip"
              style={{
                ...position,
                visibility: position ? "visible" : "hidden",
              }}
            >
              {label}
            </span>,
            resolveOverlayPortalTarget(triggerRef.current),
          )
        : null}
    </>
  );
}
