import type { HostExtensionAdapter } from "../host/host-types";
import { createSillyTavernRuntimeHost, type RuntimeSillyTavernContext } from "../host/runtime-host";
import { ProfileStore } from "../state/profile-store";
import { mountCompanionLauncher, type CompanionLauncher } from "../ui/launcher";

export interface CompanionContext extends RuntimeSillyTavernContext {
  host?: HostExtensionAdapter;
  hostFactory?: () => Promise<HostExtensionAdapter>;
}

export type BootstrapResult =
  { ok: true } | { ok: false; reason: "missing-context" | "missing-host" | "missing-menu" };

interface ActiveCompanion {
  launcher: CompanionLauncher;
  store: ProfileStore;
}

let activeCompanion: ActiveCompanion | null = null;
let bootstrapInFlight: Promise<BootstrapResult> | null = null;

export function bootstrapCompanion(
  suppliedContext?: CompanionContext | null,
): Promise<BootstrapResult> {
  if (activeCompanion) {
    return Promise.resolve({ ok: true });
  }
  if (bootstrapInFlight) {
    return bootstrapInFlight;
  }

  const attempt = performBootstrap(suppliedContext);
  bootstrapInFlight = attempt;
  void attempt.then(
    () => {
      if (bootstrapInFlight === attempt) bootstrapInFlight = null;
    },
    () => {
      if (bootstrapInFlight === attempt) bootstrapInFlight = null;
    },
  );
  return attempt;
}

async function performBootstrap(
  suppliedContext?: CompanionContext | null,
): Promise<BootstrapResult> {
  const context = suppliedContext === undefined ? resolveGlobalContext() : suppliedContext;
  if (!context) {
    return { ok: false, reason: "missing-context" };
  }
  let host: HostExtensionAdapter;
  try {
    host =
      context.host ?? (await (context.hostFactory?.() ?? createSillyTavernRuntimeHost(context)));
  } catch (error) {
    console.error("Tavernary Companion could not initialize the SillyTavern host adapter.", error);
    return { ok: false, reason: "missing-host" };
  }

  await whenDocumentReady();
  const launcherAnchor = document.querySelector("#extensions_details");
  if (!launcherAnchor) {
    return { ok: false, reason: "missing-menu" };
  }

  const store = new ProfileStore({
    extensionSettings: context.extensionSettings,
    saveSettingsDebounced: context.saveSettingsDebounced,
  });
  const launcher = mountCompanionLauncher({ anchor: launcherAnchor, host, store });
  activeCompanion = { launcher, store };
  return { ok: true };
}

export function disposeCompanion(): void {
  activeCompanion?.launcher.dispose();
  activeCompanion = null;
}

function resolveGlobalContext(): CompanionContext | null {
  const root = globalThis as typeof globalThis & {
    SillyTavern?: { getContext(): CompanionContext | null };
  };
  return root.SillyTavern?.getContext() ?? null;
}

async function whenDocumentReady(): Promise<void> {
  if (document.readyState !== "loading") {
    return;
  }
  await new Promise<void>((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}
