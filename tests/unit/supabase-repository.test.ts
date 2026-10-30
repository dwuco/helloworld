import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseRepository, fromInventory, toInventory } from "@/lib/repository/supabase";
import { ValidationError } from "@/lib/validation";

describe("Supabase row mapping", () => {
  it("maps numeric strings and snake_case columns", () => {
    const item = toInventory({
      id: "1", household_id: "h", name: "Rice", quantity: "2.5", unit: "lb", location: "pantry", category: "grains",
      expires_on: null, low_stock_threshold: "1", notes: "", created_at: "c", updated_at: "u",
    });
    expect(item).toMatchObject({ quantity: 2.5, lowStockThreshold: 1, expiresOn: null, location: "pantry" });
  });

  it("only includes provided fields in updates", () => {
    expect(fromInventory({ quantity: 3 })).toEqual({ quantity: 3 });
    expect(fromInventory({ name: " Eggs ", expiresOn: "" })).toEqual({ name: "Eggs", expires_on: null });
  });
});

/** Minimal chainable fake of the supabase-js query builder. */
function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const calls: { table: string; op: string; payload?: unknown; filters: [string, unknown][] }[] = [];
  const from = vi.fn((table: string) => {
    const call = { table, op: "select", payload: undefined as unknown, filters: [] as [string, unknown][] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    const chain = (op?: string) => (payload?: unknown) => {
      if (op) {
        call.op = op;
        call.payload = payload;
      }
      return builder;
    };
    builder.insert = chain("insert");
    builder.update = chain("update");
    builder.upsert = chain("upsert");
    builder.delete = chain("delete");
    builder.select = chain();
    builder.order = chain();
    builder.eq = (col: string, val: unknown) => {
      call.filters.push([col, val]);
      return builder;
    };
    builder.single = () => Promise.resolve(result);
    builder.maybeSingle = () => Promise.resolve(result);
    builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return builder;
  });
  return { client: { from } as unknown as SupabaseClient, calls };
}

describe("SupabaseRepository", () => {
  const row = {
    id: "i1", household_id: "h1", name: "Milk", quantity: "1", unit: "bottle", location: "fridge", category: "dairy",
    expires_on: null, low_stock_threshold: null, notes: "", created_at: "c", updated_at: "u",
  };

  it("scopes inserts to the household", async () => {
    const { client, calls } = fakeClient({ data: row, error: null });
    const repo = new SupabaseRepository(client, "h1", "u1");
    const item = await repo.createInventory({
      name: "Milk", quantity: 1, unit: "bottle", location: "fridge", category: "dairy", expiresOn: null, lowStockThreshold: null, notes: "",
    });
    expect(item.name).toBe("Milk");
    expect(calls[0]).toMatchObject({ table: "inventory_items", op: "insert" });
    expect((calls[0]!.payload as Record<string, unknown>).household_id).toBe("h1");
  });

  it("validates partial updates before sending them", async () => {
    const { client, calls } = fakeClient({ data: row, error: null });
    const repo = new SupabaseRepository(client, "h1", "u1");
    await expect(repo.updateInventory("i1", { quantity: -1 })).rejects.toBeInstanceOf(ValidationError);
    expect(calls).toHaveLength(0);
  });

  it("surfaces database errors with context", async () => {
    const { client } = fakeClient({ data: null, error: { message: "permission denied" } });
    const repo = new SupabaseRepository(client, "h1", "u1");
    await expect(repo.deleteInventory("i1")).rejects.toThrow("Could not delete item: permission denied");
  });

  it("stores email consent per user in profiles, not on the household", async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    const repo = new SupabaseRepository(client, "h1", "u1");
    await repo.saveSettings({
      householdName: "Home", expiringSoonDays: 3, assumeStaples: true, defaultServings: 2, onboarded: true,
      emailConsent: { optedIn: false, optedInAt: null },
    });
    const hh = calls.find((c) => c.table === "households")!;
    const profile = calls.find((c) => c.table === "profiles")!;
    expect(JSON.stringify(hh.payload)).not.toContain("email");
    expect(profile.payload).toMatchObject({ user_id: "u1", email_import_opt_in: false });
  });
});
