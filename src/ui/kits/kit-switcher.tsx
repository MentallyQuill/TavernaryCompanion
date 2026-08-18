import type { KitCardViewModel } from "../../kits/kit-view-model";

export function KitSwitcher({
  kits,
  activeKitId,
  disabled,
  onActivate,
}: {
  kits: readonly KitCardViewModel[];
  activeKitId: string | null;
  disabled?: boolean;
  onActivate(id: string): void;
}): preact.JSX.Element {
  const installed = kits.filter(
    ({ operationalStatus }) => operationalStatus === "Installed" || operationalStatus === "Active",
  );
  return (
    <label class="tavernary-companion-kit-switcher">
      Active managed Kit
      <select
        value={activeKitId ?? ""}
        disabled={disabled}
        onChange={(event) => {
          if (event.currentTarget.value && event.currentTarget.value !== activeKitId)
            onActivate(event.currentTarget.value);
        }}
      >
        <option value="">None</option>
        {installed.map((kit) => (
          <option key={kit.id} value={kit.id}>
            {kit.title}
            {kit.id === activeKitId ? " (active)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
