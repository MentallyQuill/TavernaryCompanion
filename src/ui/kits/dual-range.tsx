export type DualRangeValue = readonly [minimum: number, maximum: number];

export function DualRange({
  label,
  minimumLabel,
  maximumLabel,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  minimumLabel: string;
  maximumLabel: string;
  min: number;
  max: number;
  step?: number;
  value: DualRangeValue;
  onChange(value: DualRangeValue): void;
}): preact.JSX.Element {
  const [minimum, maximum] = value;
  const span = Math.max(1, max - min);
  const minimumPercent = ((minimum - min) / span) * 100;
  const maximumPercent = ((maximum - min) / span) * 100;
  const handleKeyDown = (
    thumb: "minimum" | "maximum",
    event: preact.JSX.TargetedKeyboardEvent<HTMLInputElement>,
  ) => {
    if (!["PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = thumb === "minimum" ? minimum : maximum;
    const target =
      event.key === "Home"
        ? thumb === "minimum"
          ? min
          : minimum
        : event.key === "End"
          ? thumb === "minimum"
            ? maximum
            : max
          : current + (event.key === "PageUp" ? 5 * step : -5 * step);
    if (thumb === "minimum") {
      onChange([Math.max(min, Math.min(target, maximum)), maximum]);
    } else {
      onChange([minimum, Math.min(max, Math.max(target, minimum))]);
    }
  };

  return (
    <fieldset class="tavernary-companion-dual-range">
      <legend>{label}</legend>
      <div class="tavernary-companion-dual-range__readouts" aria-hidden="true">
        <span>Min {minimum}</span>
        <span>Max {maximum}</span>
      </div>
      <div
        class="tavernary-companion-dual-range__track"
        style={`--range-start:${minimumPercent}%;--range-end:${maximumPercent}%`}
      >
        <input
          type="range"
          aria-label={minimumLabel}
          min={min}
          max={maximum}
          step={step}
          value={minimum}
          onInput={(event) =>
            onChange([Math.min(event.currentTarget.valueAsNumber, maximum), maximum])
          }
          onKeyDown={(event) => handleKeyDown("minimum", event)}
        />
        <input
          type="range"
          aria-label={maximumLabel}
          min={minimum}
          max={max}
          step={step}
          value={maximum}
          onInput={(event) =>
            onChange([minimum, Math.max(event.currentTarget.valueAsNumber, minimum)])
          }
          onKeyDown={(event) => handleKeyDown("maximum", event)}
        />
      </div>
      <span class="tavernary-companion-sr-only" aria-live="polite">
        {minimum} to {maximum} projects
      </span>
    </fieldset>
  );
}
