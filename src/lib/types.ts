// Core domain types for PantryIQ. These are storage-agnostic: both the
// local (this device) repository and the Supabase repository speak them.

export const LOCATIONS = ["fridge", "freezer", "pantry"] as const;
export type StorageLocation = (typeof LOCATIONS)[number];

export const CATEGORIES = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bakery",
  "frozen",
  "grains",
  "canned",
  "condiments",
  "snacks",
  "beverages",
  "spices",
  "other",
] as const;
export type FoodCategory = (typeof CATEGORIES)[number];

export const UNITS = ["count", "lb", "oz", "g", "kg", "ml", "l", "cup", "pack", "can", "jar", "bottle", "box", "bag", "dozen"] as const;
export type Unit = (typeof UNITS)[number];

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  location: StorageLocation;
  category: FoodCategory;
  /** ISO date (YYYY-MM-DD) or null when unknown / non-perishable. */
  expiresOn: string | null;
  /** Show as "running low" when quantity is at or below this value. */
  lowStockThreshold: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type InventoryInput = Omit<InventoryItem, "id" | "createdAt" | "updatedAt">;

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: FoodCategory;
  checked: boolean;
  /** Where the item came from, e.g. a recipe title. Purely informational. */
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ShoppingInput = Omit<ShoppingItem, "id" | "createdAt" | "updatedAt">;

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export interface MealPlanEntry {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  slot: MealSlot;
  /** Built-in recipe id, or null for a free-text meal. */
  recipeId: string | null;
  title: string;
  servings: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type MealPlanInput = Omit<MealPlanEntry, "id" | "createdAt" | "updatedAt">;

export const FULFILLMENT_METHODS = ["in_store", "pickup", "delivery"] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

/**
 * Lifecycle of a grocery import:
 *  - review:    parsed, waiting for the user to check lines.
 *  - awaiting:  user approved lines, but the order is a pickup/delivery that
 *               has not arrived yet. Nothing is in inventory yet.
 *  - received:  items were added to inventory.
 *  - cancelled: discarded; nothing added.
 */
export const IMPORT_STATUSES = ["review", "awaiting", "received", "cancelled"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export type ImportSource = "paste" | "file" | "manual" | "email_file";

export interface ImportLine {
  id: string;
  include: boolean;
  rawText: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: FoodCategory;
  location: StorageLocation;
  price: number | null;
  expiresOn: string | null;
}

export interface GroceryImport {
  id: string;
  retailerId: string;
  source: ImportSource;
  status: ImportStatus;
  fulfillment: FulfillmentMethod;
  /** Expected pickup/delivery date (YYYY-MM-DD), when known. */
  expectedOn: string | null;
  orderRef: string;
  lines: ImportLine[];
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailConsent {
  /** Strictly opt-in. Defaults to false and must be enabled explicitly by the user. */
  optedIn: boolean;
  optedInAt: string | null;
}

export interface Settings {
  householdName: string;
  /** Items expiring within this many days are flagged on the dashboard. */
  expiringSoonDays: number;
  /** Treat salt, pepper, oil and water as always available when matching recipes. */
  assumeStaples: boolean;
  defaultServings: number;
  emailConsent: EmailConsent;
  /** True once the user chose sample data or an empty start. */
  onboarded: boolean;
}

export interface PantrySnapshot {
  inventory: InventoryItem[];
  shopping: ShoppingItem[];
  mealPlan: MealPlanEntry[];
  imports: GroceryImport[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  householdName: "My household",
  expiringSoonDays: 3,
  assumeStaples: true,
  defaultServings: 2,
  emailConsent: { optedIn: false, optedInAt: null },
  onboarded: false,
};

export const LOCATION_LABELS: Record<StorageLocation, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  pantry: "Pantry",
};

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  in_store: "In-store purchase",
  pickup: "Pickup",
  delivery: "Delivery",
};
