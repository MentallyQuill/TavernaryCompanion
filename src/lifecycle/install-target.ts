export type InstallTarget =
  | {
      kind: "checked";
      requestedSha: string;
      checkedAt: string;
      reportId: string;
      reportUrl: string;
    }
  | {
      kind: "newest";
      requestedSha: string | null;
      resolvedAt: string | null;
    };

export type ManagedInstallProvenance =
  | {
      targetKind: "checked" | "newest";
      requestedSha: string | null;
      installedSha: string | null;
      catalogGeneratedAt: string;
      tavernKeeperReportId: string | null;
    }
  | {
      targetKind: "legacy-unknown";
      requestedSha: null;
      installedSha: null;
      catalogGeneratedAt: null;
      tavernKeeperReportId: null;
    };

export const legacyInstallProvenance = (): ManagedInstallProvenance => ({
  targetKind: "legacy-unknown",
  requestedSha: null,
  installedSha: null,
  catalogGeneratedAt: null,
  tavernKeeperReportId: null,
});

export function isFullCommitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value);
}
