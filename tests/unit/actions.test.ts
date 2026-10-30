import { describe, expect, it } from "vitest";
import { LocalRepository } from "@/lib/repository/local";
import { addToShoppingList, approveImport, cancelImport, loadSampleData, purchaseCheckedItems, receiveImport } from "@/lib/actions";
import { buildImportLine } from "@/lib/receipt-parser";
import type { GroceryImport } from "@/lib/types";

function draft(extra: Partial<GroceryImport> = {}): GroceryImport {
  return {
    id: "imp-1", retailerId: "walmart", source: "paste", status: "review", fulfillment: "pickup",
    expectedOn: null, orderRef: "", receivedAt: null, createdAt: "", updatedAt: "",
    lines: [buildImportLine("Avocados", 3), buildImportLine("Whole milk", 1, "bottle"), { ...buildImportLine("Candy bar"), include: false }],
    ...extra,
  };
}

describe("grocery import lifecycle", () => {
  it("pickup orders wait for confirmation before touching inventory", async () => {
    const repo = new LocalRepository();
    const record = draft();
    await repo.saveImport(record);
    const res = await approveImport(repo, record, []);
    expect(res.status).toBe("awaiting");
    let snap = await repo.load();
    expect(snap.inventory).toEqual([]);
    expect(snap.imports[0]!.status).toBe("awaiting");

    const stock = await receiveImport(repo, snap.imports[0]!, snap.inventory);
    expect(stock).toEqual({ added: 2, merged: 0 });
    snap = await repo.load();
    expect(snap.inventory.map((i) => i.name).sort()).toEqual(["Avocados", "Whole milk"]);
    expect(snap.imports[0]!.status).toBe("received");
    expect(snap.imports[0]!.receivedAt).toBeTruthy();
    // Excluded line was not added
    expect(snap.inventory.find((i) => i.name === "Candy bar")).toBeUndefined();
  });

  it("in-store purchases go straight to inventory", async () => {
    const repo = new LocalRepository();
    const res = await approveImport(repo, draft({ fulfillment: "in_store" }), []);
    expect(res.status).toBe("received");
    expect((await repo.load()).inventory).toHaveLength(2);
  });

  it("merges with existing items instead of duplicating, keeping the earlier expiry", async () => {
    const repo = new LocalRepository();
    const existing = await repo.createInventory({
      name: "Avocado", quantity: 1, unit: "count", location: "fridge", category: "produce",
      expiresOn: "2000-01-01", lowStockThreshold: null, notes: "",
    });
    const record = draft({ fulfillment: "delivery" });
    record.lines[0]!.location = "fridge";
    const stock = await receiveImport(repo, record, [existing]);
    expect(stock.merged).toBe(1);
    const avocado = (await repo.load()).inventory.find((i) => i.id === existing.id)!;
    expect(avocado.quantity).toBe(4);
    expect(avocado.expiresOn).toBe("2000-01-01");
  });

  it("cannot receive twice or cancel a received import", async () => {
    const repo = new LocalRepository();
    const received = { ...draft(), status: "received" as const };
    await expect(receiveImport(repo, received, [])).rejects.toThrow(/already/);
    await expect(cancelImport(repo, received)).rejects.toThrow();
  });

  it("requires at least one included line", async () => {
    const repo = new LocalRepository();
    const record = draft({ fulfillment: "in_store" });
    record.lines.forEach((l) => (l.include = false));
    await expect(approveImport(repo, record, [])).rejects.toThrow(/at least one/);
  });
});

describe("shopping list actions", () => {
  it("skips duplicates when adding missing recipe ingredients", async () => {
    const repo = new LocalRepository();
    await repo.createShopping({ name: "Garlic", quantity: 1, unit: "count", category: "produce", checked: false, source: null });
    const snap = await repo.load();
    const res = await addToShoppingList(repo, [{ name: "garlic", source: "Stir-fry" }, { name: "Soy sauce", source: "Stir-fry" }, { name: "Soy Sauce", source: "x" }], snap.shopping);
    expect(res).toEqual({ added: 1, skipped: 2 });
  });

  it("moves checked items into inventory and removes them from the list", async () => {
    const repo = new LocalRepository();
    await repo.createShopping({ name: "Frozen peas", quantity: 2, unit: "bag", category: "other", checked: true, source: null });
    await repo.createShopping({ name: "Bread", quantity: 1, unit: "count", category: "bakery", checked: false, source: null });
    const snap = await repo.load();
    const res = await purchaseCheckedItems(repo, snap.shopping, snap.inventory);
    expect(res.moved).toBe(1);
    const after = await repo.load();
    expect(after.shopping.map((s) => s.name)).toEqual(["Bread"]);
    expect(after.inventory[0]).toMatchObject({ name: "Frozen peas", location: "freezer", category: "frozen", quantity: 2 });
  });
});

describe("sample data", () => {
  it("loads inventory across all three locations plus a pending pickup", async () => {
    const repo = new LocalRepository();
    await loadSampleData(repo);
    const snap = await repo.load();
    expect(new Set(snap.inventory.map((i) => i.location))).toEqual(new Set(["fridge", "freezer", "pantry"]));
    expect(snap.imports.some((i) => i.status === "awaiting")).toBe(true);
    expect(snap.mealPlan.length).toBeGreaterThan(0);
  });
});
