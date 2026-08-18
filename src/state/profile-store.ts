import type { ProfileStateV1 } from "./profile-state";
import { migrateProfileState } from "./state-migrations";

const PROFILE_NAMESPACE = "tavernaryCompanion";

export interface ProfileStoreDependencies {
  extensionSettings: Record<string, unknown>;
  saveSettingsDebounced(): void | Promise<void>;
}

export type ProfileStateMutator = (
  draft: ProfileStateV1,
) => ProfileStateV1 | void | Promise<ProfileStateV1 | void>;

export type ProfileStateSubscriber = (state: ProfileStateV1) => void;

export class ProfileStore {
  readonly #dependencies: ProfileStoreDependencies;
  readonly #subscribers = new Set<ProfileStateSubscriber>();
  #state: ProfileStateV1;
  #queue: Promise<void> = Promise.resolve();

  constructor(dependencies: ProfileStoreDependencies) {
    this.#dependencies = dependencies;
    this.#state = migrateProfileState(dependencies.extensionSettings[PROFILE_NAMESPACE]);
  }

  read(): ProfileStateV1 {
    return structuredClone(this.#state);
  }

  update(mutator: ProfileStateMutator): Promise<ProfileStateV1> {
    const execute = async (): Promise<ProfileStateV1> => {
      const draft = structuredClone(this.#state);
      const result = await mutator(draft);
      const next = migrateProfileState(result ?? draft);

      this.#state = structuredClone(next);
      this.#dependencies.extensionSettings[PROFILE_NAMESPACE] = structuredClone(next);
      await this.#dependencies.saveSettingsDebounced();

      for (const subscriber of this.#subscribers) {
        subscriber(structuredClone(next));
      }

      return structuredClone(next);
    };

    const operation = this.#queue.then(execute, execute);
    this.#queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  subscribe(subscriber: ProfileStateSubscriber): () => void {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }
}
