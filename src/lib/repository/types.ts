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

/**
 * Storage abstraction. The UI never talks to localStorage or Supabase
 * directly; it goes through one of these implementations:
 *  - LocalRepository:    this browser only (default; no account needed)
 *  - SupabaseRepository: a shared household synced through Supabase
 */
export interface PantryRepository {
  readonly kind: "local" | "supabase";
  load(): Promise<PantrySnapshot>;

  createInventory(input: InventoryInput): Promise<InventoryItem>;
  updateInventory(id: string, patch: Partial<InventoryInput>): Promise<InventoryItem>;
  deleteInventory(id: string): Promise<void>;

  createShopping(input: ShoppingInput): Promise<ShoppingItem>;
  updateShopping(id: string, patch: Partial<ShoppingInput>): Promise<ShoppingItem>;
  deleteShopping(id: string): Promise<void>;

  createMeal(input: MealPlanInput): Promise<MealPlanEntry>;
  updateMeal(id: string, patch: Partial<MealPlanInput>): Promise<MealPlanEntry>;
  deleteMeal(id: string): Promise<void>;

  /** Insert or replace a grocery import (including its lines). */
  saveImport(record: GroceryImport): Promise<GroceryImport>;
  deleteImport(id: string): Promise<void>;

  saveSettings(settings: Settings): Promise<Settings>;

  /** Remove all inventory, shopping, meal plan and import data. Settings are reset except household name. */
  clearAll(): Promise<void>;
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} was not found. It may have been deleted on another device.`);
    this.name = "NotFoundError";
  }
}
