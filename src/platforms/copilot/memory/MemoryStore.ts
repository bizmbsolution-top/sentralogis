import { UserMemoryState, INITIAL_MEMORY } from './OperationalMemory';

/**
 * In-memory store for Operational Context, scoped by User ID.
 * In production, this would be backed by Redis or Postgres.
 */
export class MemoryStore {
  private static instance: MemoryStore;
  private store: Map<string, UserMemoryState>;

  private constructor() {
    this.store = new Map<string, UserMemoryState>();
  }

  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  public getMemory(userId: string): UserMemoryState {
    if (!this.store.has(userId)) {
      this.store.set(userId, { ...INITIAL_MEMORY, currentUser: userId });
    }
    return this.store.get(userId)!;
  }

  public updateMemory(userId: string, updates: Partial<UserMemoryState>): void {
    const current = this.getMemory(userId);
    this.store.set(userId, {
      ...current,
      ...updates,
      updatedAt: Date.now()
    });
  }

  public clearMemory(userId: string): void {
    this.store.delete(userId);
  }
}
