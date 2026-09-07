import type { HostUpdateInspection } from "../updates/update-types";

export type HostExtensionType = "local" | "global";

export interface HostExtension {
  internalName: string;
  folderName: string;
  repositoryUrl?: string | null;
  enabled: boolean;
  type: HostExtensionType;
  manifest: Record<string, unknown> | null;
}

export interface HostPopupOptions {
  id?: string;
  title?: string;
  wide?: boolean;
  large?: boolean;
  transparent?: boolean;
  dismissOnBackdrop?: boolean;
  allowVerticalScrolling?: boolean;
}

export interface HostInstallCapabilities {
  pinnedCommitInstall: boolean;
  remoteRevisionLookup: boolean;
  localRevisionLookup: boolean;
}

export interface HostResolvedRevision {
  sha: string;
}

export interface HostExtensionAdapter {
  discover(): Promise<HostExtension[]>;
  readExtensionRepositoryUrl(input: {
    internalName: string;
    type: HostExtensionType;
  }): Promise<string | null>;
  getInstallCapabilities(): Promise<HostInstallCapabilities>;
  resolveRemoteRevision(input: {
    repositoryUrl: string;
    branch: string | null;
  }): Promise<HostResolvedRevision>;
  install(input: {
    repositoryUrl: string;
    branch: string | null;
    commitSha?: string | null;
  }): Promise<void>;
  readLocalRevision(input: {
    internalName: string;
    type: HostExtensionType;
  }): Promise<string | null>;
  inspectUpdate(input: {
    internalName: string;
    type: HostExtensionType;
    repositoryUrl: string;
    branch: string | null;
    candidateShas: string[];
  }): Promise<HostUpdateInspection>;
  applyUpdate(input: {
    internalName: string;
    type: HostExtensionType;
    repositoryUrl: string;
    branch: string | null;
    expectedCurrentSha: string;
    targetSha: string | null;
  }): Promise<void>;
  remove(input: { internalName: string; type: HostExtensionType }): Promise<void>;
  enable(internalName: string): Promise<void>;
  disable(internalName: string): Promise<void>;
  reload(): void;
  openExtensionManager(): Promise<void>;
  openExternal(url: string): void;
  showPopup(content: HTMLElement, options: HostPopupOptions): Promise<void>;
}
