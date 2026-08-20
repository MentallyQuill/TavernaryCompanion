export type InstalledInventoryLoadState = "loading" | "ready" | "error";

export interface InventoryRefreshSnapshot {
  loadState: InstalledInventoryLoadState;
  refreshing: boolean;
}

export interface InventoryRefreshCoordinator {
  read(): InventoryRefreshSnapshot;
  subscribe(listener: (snapshot: InventoryRefreshSnapshot) => void): () => void;
  request(): Promise<boolean>;
}

export function createInventoryRefreshCoordinator(
  refresh: () => Promise<void>,
): InventoryRefreshCoordinator {
  let snapshot: InventoryRefreshSnapshot = { loadState: "loading", refreshing: false };
  let requested = 0;
  let completed = 0;
  let drain: Promise<boolean> | null = null;
  const listeners = new Set<(snapshot: InventoryRefreshSnapshot) => void>();

  const publish = (next: InventoryRefreshSnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener({ ...snapshot });
  };

  return {
    read: () => ({ ...snapshot }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    request() {
      requested += 1;
      if (drain) return drain;

      publish({
        loadState: snapshot.loadState === "ready" ? "ready" : "loading",
        refreshing: true,
      });
      drain = (async () => {
        let refreshed = false;
        try {
          while (completed < requested) {
            const requestNumber = requested;
            if (snapshot.loadState !== "ready") {
              publish({ loadState: "loading", refreshing: true });
            }
            try {
              await refresh();
              refreshed = true;
              publish({ loadState: "ready", refreshing: true });
            } catch {
              refreshed = false;
              publish({
                loadState: snapshot.loadState === "ready" ? "ready" : "error",
                refreshing: true,
              });
            }
            completed = requestNumber;
          }
          return refreshed;
        } finally {
          publish({ ...snapshot, refreshing: false });
          drain = null;
        }
      })();
      return drain;
    },
  };
}
