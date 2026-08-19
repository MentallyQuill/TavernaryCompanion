export type CompanionRoute = "projects" | "kits" | "installed";

export interface ShellDetail {
  kind: "kit";
  id: string;
  focusKey: string;
}

export interface ShellState {
  route: CompanionRoute;
  detailStack: ShellDetail[];
  filterSurface: "closed" | "rail" | "sheet";
  operationLayer: "closed" | "progress" | "receipt";
}

export type ShellEvent =
  | { type: "navigate"; route: CompanionRoute }
  | { type: "open-detail"; detail: ShellDetail }
  | { type: "open-filter"; surface: "rail" | "sheet" }
  | { type: "close-filter" }
  | { type: "set-operation"; layer: ShellState["operationLayer"] }
  | { type: "pop-detail" };

export function createShellState(route: CompanionRoute): ShellState {
  return {
    route,
    detailStack: [],
    filterSurface: "closed",
    operationLayer: "closed",
  };
}

export function reduceShellState(state: ShellState, event: ShellEvent): ShellState {
  switch (event.type) {
    case "navigate":
      return {
        ...state,
        route: event.route,
        detailStack: [],
        filterSurface: "closed",
      };
    case "open-detail":
      return { ...state, detailStack: [...state.detailStack, event.detail] };
    case "open-filter":
      return { ...state, filterSurface: event.surface };
    case "close-filter":
      return { ...state, filterSurface: "closed" };
    case "set-operation":
      return { ...state, operationLayer: event.layer };
    case "pop-detail":
      return { ...state, detailStack: state.detailStack.slice(0, -1) };
  }
}
