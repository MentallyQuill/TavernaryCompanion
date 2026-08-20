import type { TavernKeeperCardStatus } from "../../catalog/catalog-core";
import { TavernKeeperScanIndicator } from "../projects/tavernkeeper-scan-indicator";

export const LATEST_SCANNED_LABEL = "Latest scanned";
export const LATEST_CREATOR_LABEL = "Latest from creator";
export const LATEST_CREATOR_DESCRIPTION = "Newer changes have not been scanned yet.";

interface ScannedTargetIdentity {
  reportId: string;
  requestedSha: string;
}

interface VersionChoiceOptionProps {
  buttonRef?: preact.Ref<HTMLButtonElement>;
  description: string;
  descriptionId: string;
  disabledReason?: string | null;
  disabledReasonId?: string;
  label: string;
  onSelect(): void;
  scan?: { projectId: string; status: TavernKeeperCardStatus } | null;
}

export function VersionChoiceOption({
  buttonRef,
  description,
  descriptionId,
  disabledReason = null,
  disabledReasonId,
  label,
  onSelect,
  scan = null,
}: VersionChoiceOptionProps): preact.JSX.Element {
  const describedBy =
    disabledReason && disabledReasonId ? `${descriptionId} ${disabledReasonId}` : descriptionId;
  return (
    <div class="tavernary-companion-version-choice-option">
      <button
        ref={buttonRef}
        type="button"
        class="tavernary-companion-version-choice-option__select"
        aria-label={label}
        aria-describedby={describedBy}
        disabled={disabledReason !== null}
        onClick={onSelect}
      >
        <strong>{label}</strong>
        <span id={descriptionId}>{description}</span>
        {disabledReason && disabledReasonId ? (
          <span id={disabledReasonId}>{disabledReason}</span>
        ) : null}
      </button>
      {scan ? (
        <div class="tavernary-companion-version-choice-option__scan">
          <TavernKeeperScanIndicator projectId={scan.projectId} status={scan.status} inlinePanel />
        </div>
      ) : null}
    </div>
  );
}

export function scannedVersionDescription(checkedAt: string, olderThanLatest = true): string {
  const date = new Date(checkedAt);
  const label = Number.isNaN(date.valueOf())
    ? "recently"
    : new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(date);
  return olderThanLatest ? `Scanned ${label} · older than latest.` : `Scanned ${label}.`;
}

export function matchingScanStatus(
  status: TavernKeeperCardStatus | null | undefined,
  target: ScannedTargetIdentity,
): TavernKeeperCardStatus | null {
  if (!status?.report) return null;
  if (status.report.reportId !== target.reportId) return null;
  if (status.report.scannedSha.toLowerCase() !== target.requestedSha.toLowerCase()) return null;
  return status;
}

export function isVersionChoiceOwnedTarget(
  surface: HTMLElement | null,
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Node)) return false;
  if (surface?.contains(target)) return true;
  const element = target instanceof Element ? target : target.parentElement;
  return Boolean(element?.closest(".tavernary-companion-tavernkeeper-popover"));
}

export function hasOpenTavernKeeperPanel(projectId: string): boolean {
  return document.getElementById(`tavernkeeper-scan-${projectId}`) !== null;
}
