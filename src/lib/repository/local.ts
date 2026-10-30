import { DEFAULT_SETTINGS } from "../types";
import type {
  GroceryImport,
  InventoryInput,
  InventoryItem,
  MealPlanEntry,
  MealPlanInput,
  PantrySnapshot,
  Settings,
  ShoppingInput,
  ShoppingItem,
} from "../types";
import { createId, nowIso } from "../utils";
import { assertValid, validateInventory, validateMeal, validateShopping } from "../validation";
import { NotFoundError, type PantryRepository } from "./types";

export const LOCAL_STORAGE_KEY = "pantryiq:v1";

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class LocalDataCorruptError extends Error {
  constructor() {
    super("The data saved on this device could not be read. You can reset it from Settings.");
    this.name = "LocalDataCorruptError";
  }
}

function emptySnapshot(): PantrySnapshot {
  return { inventory: [], shopping: [], mealPlan: [], imports: [], settings: { ...DEFAULT_SETTINGS } };
}

/** Stores everything as one JSON document in localStorage. Data never leaves this browser. */
export class LocalRepository implements PantryRepository {
  readonly kind = "local" as const;

  constructor(private readonly store: KeyValueStore = window.localStorage) {}

  private read(): PantrySnapshot {
    const raw = this.store.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    try {
      const parsed = JSON.parse(raw) as Partial<PantrySnapshot>;
      return {
        inventory: parsed.inventory ?? [],
        shopping: parsed.shopping ?? [],
        mealPlan: parsed.mealPlan ?? [],
        imports: parsed.imports ?? [],
        settings: {
          ...DEFAULT_SETTINGS,
          ...parsed.settings,
          emailConsent: { ...DEFAULT_SETTINGS.emailConsent, ...parsed.settings?.emailConsent },
        },
      };
    } catch {
      throw new LocalDataCorruptError();
    }
  }

  private write(snapshot: PantrySnapshot): void {
    try {
      this.store.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      if (e instanceof DOMException && /quota/i.test(e.name + e.message)) {
        throw new Error("This device's storage is full. Delete old imports or items and try again.");
      }
      throw e;
    }
  }

  private mutate<T>(fn: (s: PantrySnapshot) => T): T {
    const snapshot = this.read();
    const result = fn(snapshot);
    this.write(snapshot);
    return result;
  }

  async load(): Promise<PantrySnapshot> {
    return this.read();
  }

  /** Overwrite everything (used by "reset local data" when storage is corrupt). */
  reset(): void {
    this.store.removeItem(LOCAL_STORAGE_KEY);
  }

  async createInventory(input: InventoryInput): Promise<InventoryItem> {
    assertValid(validateInventory(input));
    const now = nowIso();
    const item: InventoryItem = { ...input, name: input.name.trim(), id: createId(), createdAt: now, updatedAt: now };
    this.mutate((s) => s.inventory.push(item));
    return item;
  }

  async updateInventory(id: string, patch: Partial<InventoryInput>): Promise<InventoryItem> {
    return this.mutate((s) => {
      const idx = s.inventory.findIndex((i) => i.id === id);
      const existing = s.inventory[idx];
      if (!existing) throw new NotFoundError("That item");
      const next: InventoryItem = { ...existing, ...patch, updatedAt: nowIso() };
      assertValid(validateInventory(next));
      s.inventory[idx] = next;
      return next;
    });
  }

  async deleteInventory(id: string): Promise<void> {
    this.mutate((s) => {
      s.inventory = s.inventory.filter((i) => i.id !== id);
    });
  }

  async createShopping(input: ShoppingInput): Promise<ShoppingItem> {
    assertValid(validateShopping(input));
    const now = nowIso();
    const item: ShoppingItem = { ...input, name: input.name.trim(), id: createId(), createdAt: now, updatedAt: now };
    this.mutate((s) => s.shopping.push(item));
    return item;
  }

  async updateShopping(id: string, patch: Partial<ShoppingInput>): Promise<ShoppingItem> {
    return this.mutate((s) => {
      const idx = s.shopping.findIndex((i) => i.id === id);
      const existing = s.shopping[idx];
      if (!existing) throw new NotFoundError("That shopping item");
      const next: ShoppingItem = { ...existing, ...patch, updatedAt: nowIso() };
      assertValid(validateShopping(next));
      s.shopping[idx] = next;
      return next;
    });
  }

  async deleteShopping(id: string): Promise<void> {
    this.mutate((s) => {
      s.shopping = s.shopping.filter((i) => i.id !== id);
    });
  }

  async createMeal(input: MealPlanInput): Promise<MealPlanEntry> {
    assertValid(validateMeal(input));
    const now = nowIso();
    const entry: MealPlanEntry = { ...input, title: input.title.trim(), id: createId(), createdAt: now, updatedAt: now };
    this.mutate((s) => s.mealPlan.push(entry));
    return entry;
  }

  async updateMeal(id: string, patch: Partial<MealPlanInput>): Promise<MealPlanEntry> {
    return this.mutate((s) => {
      const idx = s.mealPlan.findIndex((i) => i.id === id);
      const existing = s.mealPlan[idx];
      if (!existing) throw new NotFoundError("That meal");
      const next: MealPlanEntry = { ...existing, ...patch, updatedAt: nowIso() };
      assertValid(validateMeal(next));
      s.mealPlan[idx] = next;
      return next;
    });
  }

  async deleteMeal(id: string): Promise<void> {
    this.mutate((s) => {
      s.mealPlan = s.mealPlan.filter((i) => i.id !== id);
    });
  }

  async saveImport(record: GroceryImport): Promise<GroceryImport> {
    const next = { ...record, updatedAt: nowIso() };
    this.mutate((s) => {
      const idx = s.imports.findIndex((i) => i.id === record.id);
      if (idx >= 0) s.imports[idx] = next;
      else s.imports.push(next);
    });
    return next;
  }

  async deleteImport(id: string): Promise<void> {
    this.mutate((s) => {
      s.imports = s.imports.filter((i) => i.id !== id);
    });
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    this.mutate((s) => {
      s.settings = settings;
    });
    return settings;
  }

  async clearAll(): Promise<void> {
    this.mutate((s) => {
      s.inventory = [];
      s.shopping = [];
      s.mealPlan = [];
      s.imports = [];
      s.settings = { ...DEFAULT_SETTINGS, householdName: s.settings.householdName, emailConsent: s.settings.emailConsent };
    });
  }
}
