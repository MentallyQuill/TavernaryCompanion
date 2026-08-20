import type { ProfileStore } from "../state/profile-store";
import { createRuntimeId } from "../runtime-id";
import type { CreatePersonalKitInput, InstalledKitStateV1, PersonalKitV1 } from "./kit-types";
import type { CatalogKit } from "../catalog/catalog-core";
import { parseInstalledKitState, parsePersonalKit } from "./kit-validation";

interface KitStoreDependencies {
  uuid?: () => string;
  now?: () => string;
}

export class KitStore {
  readonly #profile: ProfileStore;
  readonly #uuid: () => string;
  readonly #now: () => string;

  constructor(profile: ProfileStore, dependencies: KitStoreDependencies = {}) {
    this.#profile = profile;
    this.#uuid = dependencies.uuid ?? createRuntimeId;
    this.#now = dependencies.now ?? (() => new Date().toISOString());
  }

  readDefinitions(): PersonalKitV1[] {
    return Object.values(this.#profile.read().personalKits)
      .flatMap((value) => safeParse(parsePersonalKit, value))
      .sort((a, b) => a.title.localeCompare(b.title));
  }
  readDefinition(id: string): PersonalKitV1 | null {
    return safeParse(parsePersonalKit, this.#profile.read().personalKits[id])[0] ?? null;
  }
  readInstalled(id: string): InstalledKitStateV1 | null {
    return safeParse(parseInstalledKitState, this.#profile.read().installedKits[id])[0] ?? null;
  }
  readInstalledStates(): InstalledKitStateV1[] {
    return Object.values(this.#profile.read().installedKits).flatMap((value) =>
      safeParse(parseInstalledKitState, value),
    );
  }
  readActiveId(): string | null {
    return this.#profile.read().activeKitId;
  }
  async hydrateDefinitionTopology(
    id: string,
    definitionProjectIds: readonly string[],
    definitionFingerprint: string,
  ): Promise<InstalledKitStateV1 | null> {
    const installed = this.readInstalled(id);
    if (
      !installed ||
      installed.definitionProjectIds !== null ||
      installed.definitionFingerprint !== definitionFingerprint
    ) {
      return installed;
    }
    let resolved: InstalledKitStateV1 | null = installed;
    await this.#profile.update((draft) => {
      const latest = safeParse(parseInstalledKitState, draft.installedKits[id])[0] ?? null;
      resolved = latest;
      if (
        !latest ||
        latest.definitionProjectIds !== null ||
        latest.definitionFingerprint !== definitionFingerprint
      ) {
        return;
      }
      resolved = { ...latest, definitionProjectIds: [...definitionProjectIds] };
      draft.installedKits[id] = resolved;
    });
    return resolved ? structuredClone(resolved) : null;
  }
  async create(input: CreatePersonalKitInput): Promise<PersonalKitV1> {
    const now = this.#now();
    const kit = parsePersonalKit({
      formatVersion: 1,
      id: this.#uuid(),
      title: input.title,
      description: input.description ?? "",
      targetFrontend: "sillytavern",
      projectIds: input.projectIds,
      createdAt: now,
      updatedAt: now,
      origin: input.origin ?? { kind: "local" },
    });
    await this.#profile.update((draft) => {
      if (draft.personalKits[kit.id]) throw new Error("Kit ID already exists.");
      draft.personalKits[kit.id] = kit;
    });
    return structuredClone(kit);
  }
  async importDefinition(value: PersonalKitV1): Promise<PersonalKitV1> {
    const kit = parsePersonalKit(value);
    await this.#profile.update((draft) => {
      if (draft.personalKits[kit.id]) throw new Error("Kit ID already exists.");
      draft.personalKits[kit.id] = kit;
    });
    return structuredClone(kit);
  }
  async update(
    id: string,
    change: Partial<Pick<PersonalKitV1, "title" | "description" | "projectIds">>,
  ): Promise<PersonalKitV1> {
    const current = this.readDefinition(id);
    if (!current) throw new Error("Unknown personal Kit.");
    const next = parsePersonalKit({ ...current, ...change, updatedAt: this.#now() });
    await this.#profile.update((draft) => {
      draft.personalKits[id] = next;
    });
    return structuredClone(next);
  }
  async duplicate(id: string): Promise<PersonalKitV1> {
    const source = this.readDefinition(id);
    if (!source) throw new Error("Unknown personal Kit.");
    return this.create({
      title: `${source.title} copy`,
      description: source.description,
      projectIds: source.projectIds,
      origin: { kind: "local" },
    });
  }
  async copyPublished(kit: CatalogKit): Promise<PersonalKitV1> {
    return this.create({
      title: `${kit.title} copy`,
      description: kit.description,
      projectIds: kit.components
        .map(({ projectId }) => projectId)
        .filter((id) => id !== "mentallyquill-tavernary-companion"),
      origin: { kind: "published-copy", tavernaryKitId: kit.id },
    });
  }
  async removeDefinition(id: string): Promise<boolean> {
    if (!this.readDefinition(id)) return false;
    await this.#profile.update((draft) => {
      delete draft.personalKits[id];
      delete draft.installedKits[id];
      if (draft.activeKitId === id) draft.activeKitId = null;
    });
    return true;
  }
  async recordInstalledState(state: InstalledKitStateV1): Promise<InstalledKitStateV1> {
    const parsed = parseInstalledKitState(state);
    await this.#profile.update((draft) => {
      draft.installedKits[state.kitId] = parsed;
    });
    return structuredClone(parsed);
  }
  async reconcile(state: InstalledKitStateV1): Promise<InstalledKitStateV1> {
    return this.recordInstalledState(state);
  }
  async removeInstalledState(id: string): Promise<void> {
    await this.#profile.update((draft) => {
      delete draft.installedKits[id];
      if (draft.activeKitId === id) draft.activeKitId = null;
    });
  }
  async setActive(id: string | null): Promise<void> {
    if (id && !this.readInstalled(id)) throw new Error("Only an installed Kit can be active.");
    await this.#profile.update((draft) => {
      draft.activeKitId = id;
    });
  }
}

function safeParse<T>(parser: (value: unknown) => T, value: unknown): T[] {
  try {
    return [parser(value)];
  } catch {
    return [];
  }
}
