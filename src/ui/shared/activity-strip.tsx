export function ActivityStrip({ weeks }: { weeks: readonly boolean[] | null }): preact.JSX.Element {
  const values = weeks?.slice(-12) ?? Array.from({ length: 12 }, () => false);
  const padded = [
    ...Array.from({ length: Math.max(0, 12 - values.length) }, () => false),
    ...values,
  ];
  return (
    <span class="tavernary-companion-activity-strip" aria-hidden="true">
      {padded.map((value, index) => (
        <i key={index} class={value ? "is-active" : ""} />
      ))}
    </span>
  );
}
