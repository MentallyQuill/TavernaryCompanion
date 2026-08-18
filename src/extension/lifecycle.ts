import {
  bootstrapCompanion,
  disposeCompanion,
  type BootstrapResult,
  type CompanionContext,
} from "./bootstrap";

export function startCompanionLifecycle(context?: CompanionContext): Promise<BootstrapResult> {
  return bootstrapCompanion(context);
}

export function stopCompanionLifecycle(): void {
  disposeCompanion();
}
