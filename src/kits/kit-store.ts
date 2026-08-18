import type { ProfileStore } from "../state/profile-store";
import type { CreatePersonalKitInput, InstalledKitStateV1, PersonalKitV1 } from "./kit-types";
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
    this.#uuid = dependencies.uuid ?? (() => crypto.randomUUID());
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
  async removeDefinition(id: string): Promise<boolean> {
    if (!this.readDefinition(id)) return false;
    await this.#profile.update((draft) => {
      delete draft.personalKits[id];
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
