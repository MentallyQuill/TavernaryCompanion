import {
  createShellState,
  reduceShellState,
  type CompanionRoute,
  type ShellDetail,
  type ShellEvent,
  type ShellState,
} from "./shell-state";

export interface ShellBackResult {
  handled: boolean;
  focusKey: string | null;
}

export interface ShellController {
  read(): ShellState;
  subscribe(subscriber: (state: ShellState) => void): () => void;
  navigate(route: CompanionRoute): void;
  openDetail(detail: ShellDetail): void;
  openFilter(surface: "rail" | "sheet"): void;
  setOperation(layer: ShellState["operationLayer"]): void;
  back(): ShellBackResult;
}

interface ShellControllerOptions {
  initialRoute: CompanionRoute;
  persistRoute?: (route: CompanionRoute) => void | Promise<void>;
}

class DefaultShellController implements ShellController {
  readonly #persistRoute?: ShellControllerOptions["persistRoute"];
  readonly #subscribers = new Set<(state: ShellState) => void>();
  #state: ShellState;

  constructor(options: ShellControllerOptions) {
    this.#state = createShellState(options.initialRoute);
    this.#persistRoute = options.persistRoute;
  }

  read(): ShellState {
    return structuredClone(this.#state);
  }

  subscribe(subscriber: (state: ShellState) => void): () => void {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }

  navigate(route: CompanionRoute): void {
    if (this.#state.route === route && this.#state.detailStack.length === 0) return;
    this.#dispatch({ type: "navigate", route });
    void this.#persistRoute?.(route);
  }

  openDetail(detail: ShellDetail): void {
    this.#dispatch({ type: "open-detail", detail: structuredClone(detail) });
  }

  openFilter(surface: "rail" | "sheet"): void {
    this.#dispatch({ type: "open-filter", surface });
  }

  setOperation(layer: ShellState["operationLayer"]): void {
    this.#dispatch({ type: "set-operation", layer });
  }

  back(): ShellBackResult {
    if (this.#state.operationLayer !== "closed") {
      this.#dispatch({ type: "set-operation", layer: "closed" });
      return { handled: true, focusKey: "operation-trigger" };
    }
    if (this.#state.filterSurface !== "closed") {
      this.#dispatch({ type: "close-filter" });
      return { handled: true, focusKey: "filter-trigger" };
    }
    const detail = this.#state.detailStack.at(-1);
    if (detail) {
      this.#dispatch({ type: "pop-detail" });
      return { handled: true, focusKey: detail.focusKey };
    }
    return { handled: false, focusKey: null };
  }

  #dispatch(event: ShellEvent): void {
    this.#state = reduceShellState(this.#state, event);
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
}

export function createShellController(options: ShellControllerOptions): ShellController {
  return new DefaultShellController(options);
}
