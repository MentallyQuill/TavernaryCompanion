import { parseInstallContract, type CatalogProject } from "../catalog/catalog-core";
import type { HostExtension, HostExtensionAdapter } from "../host/host-types";
import type { InstallTarget } from "./install-target";

export type VerifiedInstallCleanupOutcome = "not-needed" | "succeeded" | "failed";

export class VerifiedInstallError extends Error {
  readonly cleanupOutcome: VerifiedInstallCleanupOutcome;
  readonly requestedSha: string | null;
  readonly installedSha: string | null;

  constructor(input: {
    message: string;
    cleanupOutcome: VerifiedInstallCleanupOutcome;
    requestedSha: string | null;
    installedSha: string | null;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "VerifiedInstallError";
    this.cleanupOutcome = input.cleanupOutcome;
    this.requestedSha = input.requestedSha;
    this.installedSha = input.installedSha;
  }
}

export async function executeVerifiedInstall(input: {
  host: HostExtensionAdapter;
  project: CatalogProject;
  target: InstallTarget;
}): Promise<{
  extension: HostExtension;
  installedSha: string | null;
  cleanupOutcome: "not-needed" | "succeeded";
}> {
  if (!input.project.install) {
    throw new VerifiedInstallError({
      message: "The project has no install contract.",
      cleanupOutcome: "not-needed",
      requestedSha: input.target.requestedSha,
      installedSha: null,
    });
  }
  const contract = parseInstallContract(input.project.install);
  const capabilities = await input.host.getInstallCapabilities();
  if (input.target.requestedSha !== null && !capabilities.localRevisionLookup) {
    throw new VerifiedInstallError({
      message: "The selected revision cannot be verified on this host.",
      cleanupOutcome: "not-needed",
      requestedSha: input.target.requestedSha,
      installedSha: null,
    });
  }
  await input.host.install({
    repositoryUrl: contract.repositoryUrl,
    branch: contract.branch,
    ...(input.target.requestedSha === null ? {} : { commitSha: input.target.requestedSha }),
  });

  const installed = exactFolder(await input.host.discover(), contract.folderName);
  if (!installed) {
    throw new VerifiedInstallError({
      message: "The expected installed extension was not found.",
      cleanupOutcome: "not-needed",
      requestedSha: input.target.requestedSha,
      installedSha: null,
    });
  }

  let installedSha: string | null = null;
  if (capabilities.localRevisionLookup) {
    try {
      installedSha = await input.host.readLocalRevision({
        internalName: installed.internalName,
        type: installed.type,
      });
    } catch (cause) {
      if (input.target.requestedSha === null) throw cause;
      throw await cleanupMismatch({
        host: input.host,
        extension: installed,
        expectedFolderName: contract.folderName,
        requestedSha: input.target.requestedSha,
        installedSha: null,
      });
    }
  }
  if (input.target.requestedSha !== null && installedSha !== input.target.requestedSha) {
    throw await cleanupMismatch({
      host: input.host,
      extension: installed,
      expectedFolderName: contract.folderName,
      requestedSha: input.target.requestedSha,
      installedSha,
    });
  }

  return { extension: installed, installedSha, cleanupOutcome: "not-needed" };
}

async function cleanupMismatch(input: {
  host: HostExtensionAdapter;
  extension: HostExtension;
  expectedFolderName: string;
  requestedSha: string;
  installedSha: string | null;
}): Promise<VerifiedInstallError> {
  try {
    await input.host.remove({
      internalName: input.extension.internalName,
      type: input.extension.type,
    });
    const afterCleanup = await input.host.discover();
    if (hasFolder(afterCleanup, input.expectedFolderName)) {
      throw new Error("The installed extension remained after cleanup.");
    }
    return new VerifiedInstallError({
      message: "The installed revision did not match the selected revision.",
      cleanupOutcome: "succeeded",
      requestedSha: input.requestedSha,
      installedSha: input.installedSha,
    });
  } catch (cause) {
    if (cause instanceof VerifiedInstallError) return cause;
    return new VerifiedInstallError({
      message: "The installed revision did not match, and cleanup failed.",
      cleanupOutcome: "failed",
      requestedSha: input.requestedSha,
      installedSha: input.installedSha,
      cause,
    });
  }
}

function exactFolder(
  extensions: readonly HostExtension[],
  folderName: string,
): HostExtension | null {
  const identity = folderIdentity(folderName);
  const matches = extensions.filter(
    ({ folderName: candidate }) => folderIdentity(candidate) === identity,
  );
  return matches.length === 1 ? matches[0] : null;
}

function hasFolder(extensions: readonly HostExtension[], folderName: string): boolean {
  const identity = folderIdentity(folderName);
  return extensions.some(({ folderName: candidate }) => folderIdentity(candidate) === identity);
}

function folderIdentity(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}
