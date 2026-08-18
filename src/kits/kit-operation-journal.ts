import type { ProfileStore } from "../state/profile-store";
import type { KitOperation } from "./kit-plan";
import type { KitProjectResult } from "./kit-receipt";

export interface KitOperationJournalV1 {
  formatVersion: 1;
  operationId: string;
  planId: string;
  operation: KitOperation;
  kitId: string;
  phase: string;
  startedAt: string;
  currentProjectId: string | null;
  completedProjects: KitProjectResult[];
  preOperationActiveKitId: string | null;
  requiredProjectIds: string[];
  /** Absent only in a legacy interrupted V1 journal; recovery treats every required ID as actionable. */
  actionableProjectIds?: string[];
}

export class KitOperationJournal {
  readonly #profile: ProfileStore;
  constructor(profile: ProfileStore) {
    this.#profile = profile;
  }
  read(): KitOperationJournalV1 | null {
    const value = this.#profile.read().kitOperationJournal;
    return isJournal(value) ? structuredClone(value) : null;
  }
  async write(journal: KitOperationJournalV1): Promise<void> {
    if (!isJournal(journal)) throw new Error("Invalid Kit operation journal.");
    await this.#profile.update((draft) => {
      draft.kitOperationJournal = structuredClone(journal) as unknown as Record<string, unknown>;
    });
  }
  async clear(): Promise<void> {
    await this.#profile.update((draft) => {
      draft.kitOperationJournal = null;
    });
  }
}

function isJournal(value: unknown): value is KitOperationJournalV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const journal = value as Partial<KitOperationJournalV1>;
  return (
    journal.formatVersion === 1 &&
    typeof journal.operationId === "string" &&
    typeof journal.planId === "string" &&
    typeof journal.kitId === "string" &&
    (journal.operation === "install" ||
      journal.operation === "activate" ||
      journal.operation === "deactivate" ||
      journal.operation === "uninstall") &&
    typeof journal.phase === "string" &&
    typeof journal.startedAt === "string" &&
    (journal.currentProjectId === null || typeof journal.currentProjectId === "string") &&
    Array.isArray(journal.completedProjects) &&
    Array.isArray(journal.requiredProjectIds) &&
    (!Object.hasOwn(journal, "actionableProjectIds") ||
      (Array.isArray(journal.actionableProjectIds) &&
        journal.actionableProjectIds.every((value) => typeof value === "string"))) &&
    (journal.preOperationActiveKitId === null ||
      typeof journal.preOperationActiveKitId === "string")
  );
}
