export type LifecycleReceiptStatus =
  | "succeeded"
  | "cancelled"
  | "rejected"
  | "failed"
  | "verification-failed"
  | "installed-unrecorded"
  | "removed-unrecorded";

export interface LifecycleReceiptStep {
  id: "requested" | "host-accepted" | "verified" | "recorded";
  status: "pending" | "succeeded" | "failed" | "skipped";
}

export interface LifecycleReceipt extends Record<string, unknown> {
  id: string;
  kind: "install" | "remove";
  projectId: string;
  projectName: string;
  startedAt: string;
  finishedAt: string;
  status: LifecycleReceiptStatus;
  steps: LifecycleReceiptStep[];
  safeError: string | null;
  reloadRequired: boolean;
}

interface CreateReceiptInput {
  id: string;
  kind: "install" | "remove";
  projectId: string;
  projectName: string;
  startedAt: string;
  finishedAt: string;
  status: LifecycleReceiptStatus;
  safeError: string | null;
  reloadRequired: boolean;
  completedThrough?: LifecycleReceiptStep["id"];
  failedAt?: LifecycleReceiptStep["id"];
}

export function createReceipt(input: CreateReceiptInput): LifecycleReceipt {
  const order: LifecycleReceiptStep["id"][] = [
    "requested",
    "host-accepted",
    "verified",
    "recorded",
  ];
  const completedIndex = input.completedThrough ? order.indexOf(input.completedThrough) : -1;
  return {
    id: input.id,
    kind: input.kind,
    projectId: input.projectId,
    projectName: input.projectName,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    status: input.status,
    safeError: input.safeError,
    reloadRequired: input.reloadRequired,
    steps: order.map((id, index) => ({
      id,
      status:
        id === input.failedAt
          ? "failed"
          : index <= completedIndex
            ? "succeeded"
            : input.status === "cancelled" || input.status === "rejected"
              ? "skipped"
              : "pending",
    })),
  };
}
