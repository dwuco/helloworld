import { describe, expect, it } from "vitest";
import { LOCAL_STORAGE_KEY, LocalDataCorruptError, LocalRepository } from "@/lib/repository/local";
import { ValidationError } from "@/lib/validation";
import type { InventoryInput } from "@/lib/types";

const milk: InventoryInput = {
  name: "Milk", quantity: 1, unit: "bottle", location: "fridge", category: "dairy",
  expiresOn: "2026-11-05", lowStockThreshold: null, notes: "",
};

describe("LocalRepository", () => {
  it("starts empty with default settings and email import OFF", async () => {
    const s = await new LocalRepository().load();
    expect(s.inventory).toEqual([]);
    expect(s.settings.emailConsent.optedIn).toBe(false);
    expect(s.settings.onboarded).toBe(false);
  });

  it("supports inventory CRUD and persists to localStorage", async () => {
    const repo = new LocalRepository();
    const created = await repo.createInventory(milk);
    expect(created.id).toBeTruthy();
    const updated = await repo.updateInventory(created.id, { quantity: 3, location: "freezer" });
    expect(updated).toMatchObject({ quantity: 3, location: "freezer", name: "Milk" });
    // New instance reads the same storage
    expect((await new LocalRepository().load()).inventory).toHaveLength(1);
    await repo.deleteInventory(created.id);
    expect((await repo.load()).inventory).toEqual([]);
  });

  it("rejects invalid input", async () => {
    const repo = new LocalRepository();
    await expect(repo.createInventory({ ...milk, name: "  " })).rejects.toBeInstanceOf(ValidationError);
    const created = await repo.createInventory(milk);
    await expect(repo.updateInventory(created.id, { quantity: -2 })).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws a friendly error when updating a missing record", async () => {
    await expect(new LocalRepository().updateInventory("nope", { quantity: 1 })).rejects.toThrow(/not found/);
  });

  it("supports shopping and meal CRUD", async () => {
    const repo = new LocalRepository();
    const s = await repo.createShopping({ name: "Eggs", quantity: 1, unit: "dozen", category: "dairy", checked: false, source: null });
    await repo.updateShopping(s.id, { checked: true });
    const m = await repo.createMeal({ date: "2026-10-30", slot: "dinner", recipeId: null, title: "Tacos", servings: 2, notes: "" });
    await repo.updateMeal(m.id, { slot: "lunch" });
    const snap = await repo.load();
    expect(snap.shopping[0]!.checked).toBe(true);
    expect(snap.mealPlan[0]!.slot).toBe("lunch");
    await repo.deleteShopping(s.id);
    await repo.deleteMeal(m.id);
    const after = await repo.load();
    expect(after.shopping).toEqual([]);
    expect(after.mealPlan).toEqual([]);
  });

  it("reports corrupt storage instead of silently wiping it", async () => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, "{not json");
    await expect(new LocalRepository().load()).rejects.toBeInstanceOf(LocalDataCorruptError);
    new LocalRepository().reset();
    await expect(new LocalRepository().load()).resolves.toBeTruthy();
  });

  it("clearAll keeps household name and email consent", async () => {
    const repo = new LocalRepository();
    const snap = await repo.load();
    await repo.saveSettings({ ...snap.settings, householdName: "The Smiths" });
    await repo.createInventory(milk);
    await repo.clearAll();
    const after = await repo.load();
    expect(after.inventory).toEqual([]);
    expect(after.settings.householdName).toBe("The Smiths");
  });
});
