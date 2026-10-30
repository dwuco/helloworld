import type { GroceryImport, InventoryInput, MealPlanInput, ShoppingInput } from "./types";
import { addDays, createId, nowIso, startOfWeek, todayKey } from "./utils";
import { buildImportLine } from "./receipt-parser";

/**
 * Demo content so a new user can explore every feature. It is clearly labelled
 * as sample data in the UI and only loaded when the user asks for it.
 */
export function sampleInventory(today = todayKey()): InventoryInput[] {
  const d = (n: number) => addDays(today, n);
  const base = { lowStockThreshold: null, notes: "" };
  return [
    { ...base, name: "Eggs", quantity: 10, unit: "count", location: "fridge", category: "dairy", expiresOn: d(14), lowStockThreshold: 4 },
    { ...base, name: "Whole milk", quantity: 1, unit: "bottle", location: "fridge", category: "dairy", expiresOn: d(2) },
    { ...base, name: "Cheddar cheese", quantity: 8, unit: "oz", location: "fridge", category: "dairy", expiresOn: d(21) },
    { ...base, name: "Greek yogurt", quantity: 2, unit: "count", location: "fridge", category: "dairy", expiresOn: d(1) },
    { ...base, name: "Butter", quantity: 1, unit: "box", location: "fridge", category: "dairy", expiresOn: d(45) },
    { ...base, name: "Baby spinach", quantity: 1, unit: "bag", location: "fridge", category: "produce", expiresOn: d(2) },
    { ...base, name: "Bell pepper", quantity: 2, unit: "count", location: "fridge", category: "produce", expiresOn: d(5) },
    { ...base, name: "Broccoli", quantity: 1, unit: "count", location: "fridge", category: "produce", expiresOn: d(-1), notes: "Use or compost" },
    { ...base, name: "Chicken breast", quantity: 1.5, unit: "lb", location: "fridge", category: "meat", expiresOn: d(1) },
    { ...base, name: "Strawberries", quantity: 1, unit: "pack", location: "fridge", category: "produce", expiresOn: d(3) },
    { ...base, name: "Salsa", quantity: 1, unit: "jar", location: "fridge", category: "condiments", expiresOn: d(20) },
    { ...base, name: "Salmon fillets", quantity: 2, unit: "count", location: "freezer", category: "seafood", expiresOn: d(90) },
    { ...base, name: "Frozen peas and carrots", quantity: 1, unit: "bag", location: "freezer", category: "frozen", expiresOn: d(200) },
    { ...base, name: "Ground beef", quantity: 1, unit: "lb", location: "freezer", category: "meat", expiresOn: d(60) },
    { ...base, name: "Spaghetti", quantity: 2, unit: "box", location: "pantry", category: "grains", expiresOn: d(400), lowStockThreshold: 1 },
    { ...base, name: "Jasmine rice", quantity: 3, unit: "lb", location: "pantry", category: "grains", expiresOn: null },
    { ...base, name: "Black beans", quantity: 2, unit: "can", location: "pantry", category: "canned", expiresOn: d(500) },
    { ...base, name: "Marinara sauce", quantity: 1, unit: "jar", location: "pantry", category: "canned", expiresOn: d(300) },
    { ...base, name: "Soy sauce", quantity: 1, unit: "bottle", location: "pantry", category: "condiments", expiresOn: null },
    { ...base, name: "Garlic", quantity: 1, unit: "count", location: "pantry", category: "produce", expiresOn: d(20) },
    { ...base, name: "Flour tortillas", quantity: 1, unit: "pack", location: "pantry", category: "bakery", expiresOn: d(10) },
    { ...base, name: "Rolled oats", quantity: 1, unit: "box", location: "pantry", category: "grains", expiresOn: d(200) },
    { ...base, name: "Olive oil", quantity: 1, unit: "bottle", location: "pantry", category: "condiments", expiresOn: null },
    { ...base, name: "Bananas", quantity: 1, unit: "count", location: "pantry", category: "produce", expiresOn: d(2), lowStockThreshold: 2 },
  ];
}

export function sampleShopping(): ShoppingInput[] {
  return [
    { name: "Avocados", quantity: 2, unit: "count", category: "produce", checked: false, source: "Sample data" },
    { name: "Granola", quantity: 1, unit: "bag", category: "grains", checked: false, source: "Sample data" },
    { name: "Coffee", quantity: 1, unit: "bag", category: "beverages", checked: true, source: "Sample data" },
  ];
}

export function sampleMealPlan(today = todayKey()): MealPlanInput[] {
  const monday = startOfWeek(today);
  return [
    { date: today, slot: "dinner", recipeId: "chicken-stir-fry", title: "Chicken Stir-Fry", servings: 3, notes: "" },
    { date: addDays(today, 1), slot: "breakfast", recipeId: "veggie-omelette", title: "Veggie Omelette", servings: 2, notes: "" },
    { date: addDays(monday, 4), slot: "dinner", recipeId: null, title: "Pizza night (takeout)", servings: 4, notes: "Friday treat" },
  ];
}

export function sampleImport(today = todayKey()): GroceryImport {
  const now = nowIso();
  return {
    id: createId(),
    retailerId: "walmart",
    source: "paste",
    status: "awaiting",
    fulfillment: "pickup",
    expectedOn: addDays(today, 1),
    orderRef: "SAMPLE-1001",
    lines: [buildImportLine("Avocados", 3, "count", 2.97), buildImportLine("Sour cream", 1, "count", 1.98), buildImportLine("Lemons", 2, "count", 1.1)],
    receivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
