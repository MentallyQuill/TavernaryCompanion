export interface VendorSyncOptions {
  root?: string;
  repository?: string;
  commit: string;
  local?: string;
}

export function syncVendor(options: VendorSyncOptions): Promise<{ commit: string; files: number }>;
export function verifyVendorLock(options?: { root?: string }): Promise<{ ok: true }>;
