import { startCompanionLifecycle, stopCompanionLifecycle } from "./lifecycle";

export async function tavernaryCompanionOnInstall(): Promise<void> {
  await startCompanionLifecycle();
}

export async function tavernaryCompanionOnUpdate(): Promise<void> {
  await startCompanionLifecycle();
}

export async function tavernaryCompanionOnDelete(): Promise<void> {
  stopCompanionLifecycle();
}

export async function tavernaryCompanionOnClean(): Promise<void> {
  stopCompanionLifecycle();
}

export async function tavernaryCompanionOnEnable(): Promise<void> {
  await startCompanionLifecycle();
}

export async function tavernaryCompanionOnDisable(): Promise<void> {
  stopCompanionLifecycle();
}

export async function tavernaryCompanionOnActivate(): Promise<void> {
  await startCompanionLifecycle();
}
