export type HostExtensionType = "local" | "global";

export interface HostExtension {
  internalName: string;
  folderName: string;
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

export interface HostExtensionAdapter {
  discover(): Promise<HostExtension[]>;
  install(input: { repositoryUrl: string; branch: string | null }): Promise<void>;
  remove(input: { internalName: string; type: HostExtensionType }): Promise<void>;
  enable(internalName: string): Promise<void>;
  disable(internalName: string): Promise<void>;
  reload(): void;
  openExtensionManager(): Promise<void>;
  openExternal(url: string): void;
  showPopup(content: HTMLElement, options: HostPopupOptions): Promise<void>;
}
