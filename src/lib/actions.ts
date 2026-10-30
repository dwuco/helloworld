import type { PantryRepository } from "./repository/types";
import type { GroceryImport, ImportLine, InventoryItem, ShoppingItem, Unit } from "./types";
import { classifyFood, addDays, normalizeName, nowIso, todayKey } from "./utils";
import { sampleImport, sampleInventory, sampleMealPlan, sampleShopping } from "./sample-data";

/**
 * Multi-step domain operations built on top of a PantryRepository. They work
 * the same for local and Supabase storage, and are unit tested against the
 * local repository.
 */

function earliest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

export function findMergeTarget(inventory: InventoryItem[], name: string, location: InventoryItem["location"], unit: Unit) {
  const key = normalizeName(name);
  return inventory.find((i) => normalizeName(i.name) === key && i.location === location && i.unit === unit) ?? null;
}

export interface StockResult {
  added: number;
  merged: number;
}

/**
 * Add lines to inventory. Lines that match an existing item (same name,
 * location and unit) increase its quantity instead of creating a duplicate;
 * the earlier expiry date is kept so nothing is forgotten.
 */
export async function addLinesToInventory(
  repo: PantryRepository,
  lines: Pick<ImportLine, "name" | "quantity" | "unit" | "category" | "location" | "expiresOn">[],
  inventory: InventoryItem[],
): Promise<StockResult> {
  const working = [...inventory];
  let added = 0;
  let merged = 0;
  for (const line of lines) {
    const target = findMergeTarget(working, line.name, line.location, line.unit);
    if (target) {
      const updated = await repo.updateInventory(target.id, {
        quantity: Math.round((target.quantity + line.quantity) * 100) / 100,
        expiresOn: earliest(target.expiresOn, line.expiresOn),
      });
      working[working.findIndex((i) => i.id === target.id)] = updated;
      merged++;
    } else {
      const created = await repo.createInventory({
        name: line.name,
        quantity: line.quantity,
        unit: line.unit,
        category: line.category,
        location: line.location,
        expiresOn: line.expiresOn,
        lowStockThreshold: null,
        notes: "",
      });
      working.push(created);
      added++;
    }
  }
  return { added, merged };
}

export class ImportStateError extends Error {}

/** Mark an import as received and put its included lines into inventory. */
export async function receiveImport(repo: PantryRepository, record: GroceryImport, inventory: InventoryItem[]): Promise<StockResult> {
  if (record.status === "received") throw new ImportStateError("This order was already added to your inventory.");
  if (record.status === "cancelled") throw new ImportStateError("This import was cancelled.");
  const lines = record.lines.filter((l) => l.include && l.name.trim() && l.quantity > 0);
  if (lines.length === 0) throw new ImportStateError("Select at least one item to add.");
  const result = await addLinesToInventory(repo, lines, inventory);
  await repo.saveImport({ ...record, status: "received", receivedAt: nowIso() });
  return result;
}

/**
 * Approve a reviewed import. In-store purchases go straight to inventory.
 * Pickup and delivery orders wait in "awaiting" until the user confirms they
 * actually arrived (items can be substituted or out of stock).
 */
export async function approveImport(
  repo: PantryRepository,
  record: GroceryImport,
  inventory: InventoryItem[],
): Promise<{ status: "received" | "awaiting"; result?: StockResult }> {
  if (record.fulfillment === "in_store") {
    const result = await receiveImport(repo, record, inventory);
    return { status: "received", result };
  }
  if (!record.lines.some((l) => l.include)) throw new ImportStateError("Select at least one item.");
  await repo.saveImport({ ...record, status: "awaiting" });
  return { status: "awaiting" };
}

export async function cancelImport(repo: PantryRepository, record: GroceryImport): Promise<void> {
  if (record.status === "received") throw new ImportStateError("Received orders can't be cancelled. Edit the items in inventory instead.");
  await repo.saveImport({ ...record, status: "cancelled" });
}

/** Move checked shopping items into inventory and remove them from the list. */
export async function purchaseCheckedItems(
  repo: PantryRepository,
  shopping: ShoppingItem[],
  inventory: InventoryItem[],
): Promise<StockResult & { moved: number }> {
  const checked = shopping.filter((s) => s.checked);
  const lines = checked.map((s) => {
    const c = classifyFood(s.name);
    return {
      name: s.name,
      quantity: s.quantity,
      unit: s.unit,
      category: s.category === "other" ? c.category : s.category,
      location: c.location,
      expiresOn: c.shelfDays != null ? addDays(todayKey(), c.shelfDays) : null,
    };
  });
  const result = await addLinesToInventory(repo, lines, inventory);
  for (const s of checked) await repo.deleteShopping(s.id);
  return { ...result, moved: checked.length };
}

/** Add names to the shopping list, skipping anything already on it (unchecked). Returns how many were added. */
export async function addToShoppingList(
  repo: PantryRepository,
  items: { name: string; source: string | null; quantity?: number; unit?: Unit }[],
  shopping: ShoppingItem[],
): Promise<{ added: number; skipped: number }> {
  const existing = new Set(shopping.filter((s) => !s.checked).map((s) => normalizeName(s.name)));
  let added = 0;
  let skipped = 0;
  for (const item of items) {
    const key = normalizeName(item.name);
    if (!key || existing.has(key)) {
      skipped++;
      continue;
    }
    existing.add(key);
    await repo.createShopping({
      name: item.name,
      quantity: item.quantity ?? 1,
      unit: item.unit ?? "count",
      category: classifyFood(item.name).category,
      checked: false,
      source: item.source,
    });
    added++;
  }
  return { added, skipped };
}

/** Load demo content. Additive: existing data is kept. */
export async function loadSampleData(repo: PantryRepository): Promise<void> {
  for (const item of sampleInventory()) await repo.createInventory(item);
  for (const item of sampleShopping()) await repo.createShopping(item);
  for (const meal of sampleMealPlan()) await repo.createMeal(meal);
  await repo.saveImport(sampleImport());
}
