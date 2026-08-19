export type RevisionRelationship = "equal" | "behind" | "ahead" | "diverged";

export interface HostUpdateInspection {
  installedSha: string;
  newestSha: string;
  remoteUrl: string;
  branch: string;
  worktreeClean: boolean;
  branchMatches: boolean;
  exactUpdateSupported: boolean;
  newestRelationship: RevisionRelationship;
  candidateRelationships: Record<string, RevisionRelationship>;
}

export type UpdateTarget =
  | {
      kind: "checked";
      requestedSha: string;
      checkedAt: string;
      reportId: string;
      reportUrl: string;
    }
  | {
      kind: "newest";
      requestedSha: string;
      resolvedAt: string;
    };

export type UpdateAvailability =
  | { kind: "current" }
  | { kind: "attention"; reason: string }
  | { kind: "available"; notice: string | null; targets: UpdateTarget[] };

export interface PreparedUpdateSelection {
  target: UpdateTarget;
  binding: {
    projectId: string;
    catalogGeneratedAt: string;
    internalName: string;
    installedSha: string;
    repositoryUrl: string;
    branch: string | null;
    requestedSha: string;
  };
}
