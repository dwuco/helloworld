import type { SupabaseClient } from "@supabase/supabase-js";
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
import { assertValid, validateInventory, validateMeal, validateShopping } from "../validation";
import { NotFoundError, type PantryRepository } from "./types";

/* Row shapes as stored in Postgres (snake_case). See supabase/migrations. */
export interface InventoryRow {
  id: string;
  household_id: string;
  name: string;
  quantity: number | string;
  unit: string;
  location: string;
  category: string;
  expires_on: string | null;
  low_stock_threshold: number | string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}
interface ShoppingRow {
  id: string;
  household_id: string;
  name: string;
  quantity: number | string;
  unit: string;
  category: string;
  checked: boolean;
  source: string | null;
  created_at: string;
  updated_at: string;
}
interface MealRow {
  id: string;
  household_id: string;
  date: string;
  slot: string;
  recipe_id: string | null;
  title: string;
  servings: number;
  notes: string;
  created_at: string;
  updated_at: string;
}
interface ImportRow {
  id: string;
  household_id: string;
  retailer_id: string;
  source: string;
  status: string;
  fulfillment: string;
  expected_on: string | null;
  order_ref: string;
  lines: GroceryImport["lines"];
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

// Postgres numeric comes back as a string from PostgREST; normalize to number.
const num = (v: number | string | null): number | null => (v == null ? null : Number(v));

export const toInventory = (r: InventoryRow): InventoryItem => ({
  id: r.id,
  name: r.name,
  quantity: num(r.quantity) ?? 0,
  unit: r.unit as InventoryItem["unit"],
  location: r.location as InventoryItem["location"],
  category: r.category as InventoryItem["category"],
  expiresOn: r.expires_on,
  lowStockThreshold: num(r.low_stock_threshold),
  notes: r.notes ?? "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const fromInventory = (i: Partial<InventoryInput>) => {
  const row: Record<string, unknown> = {};
  if (i.name !== undefined) row.name = i.name.trim();
  if (i.quantity !== undefined) row.quantity = i.quantity;
  if (i.unit !== undefined) row.unit = i.unit;
  if (i.location !== undefined) row.location = i.location;
  if (i.category !== undefined) row.category = i.category;
  if (i.expiresOn !== undefined) row.expires_on = i.expiresOn || null;
  if (i.lowStockThreshold !== undefined) row.low_stock_threshold = i.lowStockThreshold;
  if (i.notes !== undefined) row.notes = i.notes;
  return row;
};

const toShopping = (r: ShoppingRow): ShoppingItem => ({
  id: r.id,
  name: r.name,
  quantity: num(r.quantity) ?? 1,
  unit: r.unit as ShoppingItem["unit"],
  category: r.category as ShoppingItem["category"],
  checked: r.checked,
  source: r.source,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const fromShopping = (i: Partial<ShoppingInput>) => {
  const row: Record<string, unknown> = {};
  if (i.name !== undefined) row.name = i.name.trim();
  if (i.quantity !== undefined) row.quantity = i.quantity;
  if (i.unit !== undefined) row.unit = i.unit;
  if (i.category !== undefined) row.category = i.category;
  if (i.checked !== undefined) row.checked = i.checked;
  if (i.source !== undefined) row.source = i.source;
  return row;
};

const toMeal = (r: MealRow): MealPlanEntry => ({
  id: r.id,
  date: r.date,
  slot: r.slot as MealPlanEntry["slot"],
  recipeId: r.recipe_id,
  title: r.title,
  servings: r.servings,
  notes: r.notes ?? "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const fromMeal = (i: Partial<MealPlanInput>) => {
  const row: Record<string, unknown> = {};
  if (i.date !== undefined) row.date = i.date;
  if (i.slot !== undefined) row.slot = i.slot;
  if (i.recipeId !== undefined) row.recipe_id = i.recipeId;
  if (i.title !== undefined) row.title = i.title.trim();
  if (i.servings !== undefined) row.servings = i.servings;
  if (i.notes !== undefined) row.notes = i.notes;
  return row;
};

const toImport = (r: ImportRow): GroceryImport => ({
  id: r.id,
  retailerId: r.retailer_id,
  source: r.source as GroceryImport["source"],
  status: r.status as GroceryImport["status"],
  fulfillment: r.fulfillment as GroceryImport["fulfillment"],
  expectedOn: r.expected_on,
  orderRef: r.order_ref ?? "",
  lines: Array.isArray(r.lines) ? r.lines : [],
  receivedAt: r.received_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// Defaults used only to validate partial updates: errors are kept for fields present in the patch.
const INVENTORY_DEFAULTS: InventoryInput = {
  name: "x", quantity: 1, unit: "count", location: "pantry", category: "other", expiresOn: null, lowStockThreshold: null, notes: "",
};
const SHOPPING_DEFAULTS: ShoppingInput = { name: "x", quantity: 1, unit: "count", category: "other", checked: false, source: null };
const MEAL_DEFAULTS: MealPlanInput = { date: "2000-01-01", slot: "dinner", recipeId: null, title: "x", servings: 1, notes: "" };

function validatePatch(errors: Record<string, string | undefined>, patch: object): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(errors).filter(([k]) => k in patch));
}

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not ${what}: ${res.error.message}`);
  if (res.data == null) throw new NotFoundError("That record");
  return res.data;
}

/** Household data synced through Supabase. All access is enforced by row-level security. */
export class SupabaseRepository implements PantryRepository {
  readonly kind = "supabase" as const;

  constructor(
    private readonly db: SupabaseClient,
    readonly householdId: string,
    readonly userId: string,
  ) {}

  async load(): Promise<PantrySnapshot> {
    const h = this.householdId;
    const [inv, shop, meals, imports, household, profile] = await Promise.all([
      this.db.from("inventory_items").select("*").eq("household_id", h).order("created_at"),
      this.db.from("shopping_items").select("*").eq("household_id", h).order("created_at"),
      this.db.from("meal_plan_entries").select("*").eq("household_id", h).order("date"),
      this.db.from("grocery_imports").select("*").eq("household_id", h).order("created_at", { ascending: false }),
      this.db.from("households").select("name, settings").eq("id", h).single(),
      this.db.from("profiles").select("email_import_opt_in, email_import_opted_in_at").eq("user_id", this.userId).maybeSingle(),
    ]);
    const hh = check(household, "load household") as { name: string; settings: Partial<Settings> | null };
    if (profile.error) throw new Error(`Could not load profile: ${profile.error.message}`);
    const p = profile.data as { email_import_opt_in: boolean; email_import_opted_in_at: string | null } | null;
    return {
      inventory: (check(inv, "load inventory") as InventoryRow[]).map(toInventory),
      shopping: (check(shop, "load shopping list") as ShoppingRow[]).map(toShopping),
      mealPlan: (check(meals, "load meal plan") as MealRow[]).map(toMeal),
      imports: (check(imports, "load imports") as ImportRow[]).map(toImport),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(hh.settings ?? {}),
        householdName: hh.name,
        onboarded: true,
        emailConsent: { optedIn: p?.email_import_opt_in ?? false, optedInAt: p?.email_import_opted_in_at ?? null },
      },
    };
  }

  async createInventory(input: InventoryInput): Promise<InventoryItem> {
    assertValid(validateInventory(input));
    const res = await this.db
      .from("inventory_items")
      .insert({ ...fromInventory(input), household_id: this.householdId })
      .select()
      .single();
    return toInventory(check(res, "add item") as InventoryRow);
  }

  async updateInventory(id: string, patch: Partial<InventoryInput>): Promise<InventoryItem> {
    assertValid(validatePatch(validateInventory({ ...INVENTORY_DEFAULTS, ...patch }), patch));
    const res = await this.db.from("inventory_items").update(fromInventory(patch)).eq("id", id).select().single();
    return toInventory(check(res, "update item") as InventoryRow);
  }

  async deleteInventory(id: string): Promise<void> {
    const res = await this.db.from("inventory_items").delete().eq("id", id);
    if (res.error) throw new Error(`Could not delete item: ${res.error.message}`);
  }

  async createShopping(input: ShoppingInput): Promise<ShoppingItem> {
    assertValid(validateShopping(input));
    const res = await this.db
      .from("shopping_items")
      .insert({ ...fromShopping(input), household_id: this.householdId })
      .select()
      .single();
    return toShopping(check(res, "add shopping item") as ShoppingRow);
  }

  async updateShopping(id: string, patch: Partial<ShoppingInput>): Promise<ShoppingItem> {
    assertValid(validatePatch(validateShopping({ ...SHOPPING_DEFAULTS, ...patch }), patch));
    const res = await this.db.from("shopping_items").update(fromShopping(patch)).eq("id", id).select().single();
    return toShopping(check(res, "update shopping item") as ShoppingRow);
  }

  async deleteShopping(id: string): Promise<void> {
    const res = await this.db.from("shopping_items").delete().eq("id", id);
    if (res.error) throw new Error(`Could not delete shopping item: ${res.error.message}`);
  }

  async createMeal(input: MealPlanInput): Promise<MealPlanEntry> {
    assertValid(validateMeal(input));
    const res = await this.db
      .from("meal_plan_entries")
      .insert({ ...fromMeal(input), household_id: this.householdId })
      .select()
      .single();
    return toMeal(check(res, "add meal") as MealRow);
  }

  async updateMeal(id: string, patch: Partial<MealPlanInput>): Promise<MealPlanEntry> {
    assertValid(validatePatch(validateMeal({ ...MEAL_DEFAULTS, ...patch }), patch));
    const res = await this.db.from("meal_plan_entries").update(fromMeal(patch)).eq("id", id).select().single();
    return toMeal(check(res, "update meal") as MealRow);
  }

  async deleteMeal(id: string): Promise<void> {
    const res = await this.db.from("meal_plan_entries").delete().eq("id", id);
    if (res.error) throw new Error(`Could not delete meal: ${res.error.message}`);
  }

  async saveImport(record: GroceryImport): Promise<GroceryImport> {
    const res = await this.db
      .from("grocery_imports")
      .upsert({
        id: record.id,
        household_id: this.householdId,
        retailer_id: record.retailerId,
        source: record.source,
        status: record.status,
        fulfillment: record.fulfillment,
        expected_on: record.expectedOn || null,
        order_ref: record.orderRef,
        lines: record.lines,
        received_at: record.receivedAt,
      })
      .select()
      .single();
    return toImport(check(res, "save import") as ImportRow);
  }

  async deleteImport(id: string): Promise<void> {
    const res = await this.db.from("grocery_imports").delete().eq("id", id);
    if (res.error) throw new Error(`Could not delete import: ${res.error.message}`);
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    const { householdName, emailConsent, expiringSoonDays, assumeStaples, defaultServings } = settings;
    const [hh, profile] = await Promise.all([
      this.db
        .from("households")
        .update({ name: householdName, settings: { expiringSoonDays, assumeStaples, defaultServings } })
        .eq("id", this.householdId),
      this.db.from("profiles").upsert({
        user_id: this.userId,
        email_import_opt_in: emailConsent.optedIn,
        email_import_opted_in_at: emailConsent.optedInAt,
      }),
    ]);
    if (hh.error) throw new Error(`Could not save household settings: ${hh.error.message}`);
    if (profile.error) throw new Error(`Could not save your preferences: ${profile.error.message}`);
    return settings;
  }

  async clearAll(): Promise<void> {
    for (const table of ["inventory_items", "shopping_items", "meal_plan_entries", "grocery_imports"]) {
      const res = await this.db.from(table).delete().eq("household_id", this.householdId);
      if (res.error) throw new Error(`Could not clear ${table.replace(/_/g, " ")}: ${res.error.message}`);
    }
  }
}
