"use client";

import clsx from "clsx";
import { PackageCheck, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { addToShoppingList, purchaseCheckedItems } from "@/lib/actions";
import { CATEGORIES, UNITS, type ShoppingInput, type ShoppingItem } from "@/lib/types";
import { classifyFood, formatQuantity, normalizeName, titleCase } from "@/lib/utils";
import { hasErrors, validateShopping, type FieldErrors } from "@/lib/validation";

export default function ShoppingPage() {
  return (
    <DataGate label="Loading shopping list">
      <ShoppingList />
    </DataGate>
  );
}

function EditDialog({ item, onClose }: { item: ShoppingItem; onClose(): void }) {
  const { mutate } = usePantry();
  const [values, setValues] = useState<ShoppingInput>({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    checked: item.checked,
    source: item.source,
  });
  const [errors, setErrors] = useState<FieldErrors<ShoppingInput>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const errs = validateShopping(values);
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    const ok = await mutate((repo) => repo.updateShopping(item.id, values), { success: "Saved." });
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit item"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" error={errors.name}>
          {(p) => <Input {...p} value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" error={errors.quantity}>
            {(p) => (
              <Input {...p} type="number" inputMode="decimal" min={0} step="any" value={Number.isFinite(values.quantity) ? values.quantity : ""} onChange={(e) => setValues((v) => ({ ...v, quantity: e.target.value === "" ? NaN : Number(e.target.value) }))} />
            )}
          </Field>
          <Field label="Unit">
            {(p) => (
              <Select {...p} value={values.unit} onChange={(e) => setValues((v) => ({ ...v, unit: e.target.value as ShoppingInput["unit"] }))}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Aisle / category">
          {(p) => (
            <Select {...p} value={values.category} onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as ShoppingInput["category"] }))}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function ShoppingList() {
  const { data, mutate } = usePantry();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<ShoppingInput["unit"]>("count");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [moving, setMoving] = useState(false);

  const checked = data.shopping.filter((s) => s.checked);
  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const s of [...data.shopping].sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name))) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => CATEGORIES.indexOf(a as ShoppingItem["category"]) - CATEGORIES.indexOf(b as ShoppingItem["category"]));
  }, [data.shopping]);

  const onList = new Set(data.shopping.filter((s) => !s.checked).map((s) => normalizeName(s.name)));
  const suggestions = data.inventory
    .filter((i) => i.quantity === 0 || (i.lowStockThreshold != null && i.quantity <= i.lowStockThreshold))
    .filter((i) => !onList.has(normalizeName(i.name)))
    .slice(0, 8);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const input: ShoppingInput = { name: name.trim(), quantity, unit, category: classifyFood(name).category, checked: false, source: null };
    const errs: FieldErrors<ShoppingInput> = validateShopping(input);
    if (hasErrors(errs)) {
      setError(errs.name ?? errs.quantity ?? "Check the item.");
      return;
    }
    if (onList.has(normalizeName(input.name))) {
      setError(`${input.name} is already on your list.`);
      return;
    }
    setError(null);
    setAdding(true);
    const ok = await mutate((repo) => repo.createShopping(input));
    setAdding(false);
    if (ok) {
      setName("");
      setQuantity(1);
      setUnit("count");
      document.getElementById("shop-name")?.focus();
    }
  };

  const moveToInventory = async () => {
    setMoving(true);
    await mutate((repo) => purchaseCheckedItems(repo, data.shopping, data.inventory), {
      success: (r) => `Moved ${r.moved} item${r.moved === 1 ? "" : "s"} to inventory (${r.added} new, ${r.merged} restocked).`,
    });
    setMoving(false);
  };

  return (
    <div>
      <PageHeader title="Shopping List" description="Shared with everyone in your household when sync is on." />

      <Card className="mb-5">
        <form onSubmit={add} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="shop-name" className="mb-1.5 block text-sm font-medium">
              Add an item
            </label>
            <Input
              id="shop-name"
              placeholder="e.g. Oat milk"
              autoComplete="off"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "shop-error" : undefined}
            />
          </div>
          <div className="grid grid-cols-[5rem_1fr_auto] gap-2 sm:grid-cols-[5rem_7rem_auto]">
            <div>
              <label htmlFor="shop-qty" className="sr-only">
                Quantity
              </label>
              <Input id="shop-qty" type="number" inputMode="decimal" min={0} step="any" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </div>
            <div>
              <label htmlFor="shop-unit" className="sr-only">
                Unit
              </label>
              <Select id="shop-unit" value={unit} onChange={(e) => setUnit(e.target.value as ShoppingInput["unit"])}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" loading={adding} aria-label="Add to list">
              <Plus className="size-4" aria-hidden /> <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </form>
        {error && (
          <p id="shop-error" className="mt-2 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Running low or out</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => mutate((repo) => addToShoppingList(repo, [{ name: s.name, source: "Running low", unit: s.unit }], data.shopping), { success: `Added ${s.name}.` })}
                >
                  <Plus className="size-3.5" aria-hidden /> {s.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {data.shopping.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="size-10" />}
          title="Your list is empty"
          description="Add items above, or open a recipe and add its missing ingredients."
        />
      ) : (
        <>
          <div className="space-y-5">
            {groups.map(([category, items]) => (
              <section key={category} aria-labelledby={`cat-${category}`}>
                <h2 id={`cat-${category}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {titleCase(category)}
                </h2>
                <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          className="size-5 shrink-0 accent-[var(--color-primary)]"
                          checked={s.checked}
                          onChange={(e) => mutate((repo) => repo.updateShopping(s.id, { checked: e.target.checked }))}
                        />
                        <span className={clsx("min-w-0", s.checked && "text-muted line-through")}>
                          <span className="block truncate font-medium">{s.name}</span>
                          <span className="flex flex-wrap gap-1 text-xs text-muted">
                            {formatQuantity(s.quantity, s.unit)}
                            {s.source && <Badge className="!py-0">{s.source}</Badge>}
                          </span>
                        </span>
                      </label>
                      <Button size="sm" variant="ghost" className="!px-2" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!px-2 text-danger"
                        aria-label={`Remove ${s.name}`}
                        onClick={() => mutate((repo) => repo.deleteShopping(s.id), { success: `Removed ${s.name}.` })}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {checked.length > 0 && (
            <div className="sticky bottom-20 z-10 mt-6 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
              <p className="text-sm">
                <strong>{checked.length}</strong> checked
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => setConfirmClear(true)}>
                  Clear checked
                </Button>
                <Button onClick={moveToInventory} loading={moving}>
                  <PackageCheck className="size-4" aria-hidden /> Move checked to inventory
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {editing && <EditDialog key={editing.id} item={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={confirmClear}
        title="Clear checked items?"
        message={`Remove ${checked.length} checked item${checked.length === 1 ? "" : "s"} without adding them to inventory?`}
        confirmLabel="Clear"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false);
          await mutate(
            async (repo) => {
              for (const s of checked) await repo.deleteShopping(s.id);
            },
            { success: "Cleared checked items." },
          );
        }}
      />
    </div>
  );
}
