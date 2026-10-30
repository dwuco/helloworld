import type { PantryRepository } from "./repository/types";
import type { PantrySnapshot } from "./types";
import { createId } from "./utils";

export const BACKUP_FORMAT = "pantryiq-backup";

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  data: Omit<PantrySnapshot, "settings">;
}

export function createBackup(snapshot: PantrySnapshot): Backup {
  const { inventory, shopping, mealPlan, imports } = snapshot;
  return { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), data: { inventory, shopping, mealPlan, imports } };
}

export function parseBackup(json: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const b = parsed as Partial<Backup>;
  if (b?.format !== BACKUP_FORMAT || b.version !== 1 || !b.data) throw new Error("That file isn't a PantryIQ backup.");
  const d = b.data;
  if (![d.inventory, d.shopping, d.mealPlan, d.imports].every(Array.isArray)) throw new Error("The backup is incomplete or damaged.");
  return b as Backup;
}

/** Add everything in a backup to the current storage (new ids, existing data kept). */
export async function restoreBackup(repo: PantryRepository, backup: Backup): Promise<number> {
  let count = 0;
  for (const { id: _id, createdAt: _c, updatedAt: _u, ...item } of backup.data.inventory) {
    await repo.createInventory(item);
    count++;
  }
  for (const { id: _id, createdAt: _c, updatedAt: _u, ...item } of backup.data.shopping) {
    await repo.createShopping(item);
    count++;
  }
  for (const { id: _id, createdAt: _c, updatedAt: _u, ...meal } of backup.data.mealPlan) {
    await repo.createMeal(meal);
    count++;
  }
  for (const record of backup.data.imports) {
    await repo.saveImport({ ...record, id: createId() });
    count++;
  }
  return count;
}
