import { describe, expect, it } from "vitest";
import { RECIPES, getRecipe, matchRecipe, rankRecipes } from "@/lib/recipes";
import type { InventoryItem } from "@/lib/types";
import { addDays, todayKey } from "@/lib/utils";

let n = 0;
function item(name: string, extra: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: String(++n), name, quantity: 1, unit: "count", location: "pantry", category: "other",
    expiresOn: null, lowStockThreshold: null, notes: "", createdAt: "", updatedAt: "", ...extra,
  };
}
const opts = { assumeStaples: true, expiringSoonDays: 3 };

describe("recipe matching", () => {
  it("every recipe has a unique id and at least one required ingredient", () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
    for (const r of RECIPES) expect(r.ingredients.some((i) => !i.optional)).toBe(true);
  });

  it("matches plural/singular and multi-word inventory names", () => {
    const r = getRecipe("veggie-omelette")!;
    const m = matchRecipe(r, [item("Large Eggs"), item("Shredded cheddar cheese"), item("Baby spinach"), item("Butter")], opts);
    expect(m.missing).toEqual([]);
    expect(m.score).toBe(100);
  });

  it("treats staples as owned only when the setting is on", () => {
    const r = getRecipe("veggie-omelette")!;
    const inv = [item("Eggs"), item("Cheese"), item("Spinach"), item("Butter")];
    expect(matchRecipe(r, inv, { ...opts, assumeStaples: false }).missing.map((i) => i.name)).toEqual(["salt", "black pepper"]);
  });

  it("ignores items with zero quantity", () => {
    const m = matchRecipe(getRecipe("greek-yogurt-parfait")!, [item("Greek yogurt", { quantity: 0 })], opts);
    expect(m.missing.map((i) => i.name)).toContain("greek yogurt");
  });

  it("does not let bell pepper satisfy black pepper", () => {
    const m = matchRecipe(getRecipe("veggie-omelette")!, [item("Bell pepper")], { ...opts, assumeStaples: false });
    expect(m.missing.map((i) => i.name)).toContain("black pepper");
  });

  it("ranks makeable recipes first and prefers ones using expiring food", () => {
    const soon = addDays(todayKey(), 1);
    const inv = [item("Greek yogurt", { expiresOn: soon }), item("Strawberries"), item("Granola"), item("Banana"), item("Milk"), item("Peanut butter")];
    const ranked = rankRecipes(inv, opts);
    expect(ranked[0]!.missing).toHaveLength(0);
    expect(ranked[0]!.recipe.id).toBe("greek-yogurt-parfait");
    expect(ranked[0]!.usesExpiring).toBe(1);
  });
});
