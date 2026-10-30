"use client";

import clsx from "clsx";
import { useState } from "react";
import type { FormEvent } from "react";
import { CATEGORIES, LOCATION_LABELS, LOCATIONS, UNITS, type InventoryInput, type StorageLocation } from "@/lib/types";
import { addDays, classifyFood, todayKey, titleCase } from "@/lib/utils";
import { hasErrors, validateInventory, type FieldErrors } from "@/lib/validation";
import { Button, Field, Input, Select, Textarea } from "./ui";

export function emptyInventoryInput(location: StorageLocation = "fridge"): InventoryInput {
  return { name: "", quantity: 1, unit: "count", location, category: "other", expiresOn: null, lowStockThreshold: null, notes: "" };
}

interface Props {
  initial: InventoryInput;
  isNew: boolean;
  submitLabel: string;
  /** Return true when saved successfully. */
  onSubmit(input: InventoryInput, opts: { addAnother: boolean }): Promise<boolean>;
  onCancel(): void;
}

export function InventoryForm({ initial, isNew, submitLabel, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<InventoryInput>(initial);
  const [errors, setErrors] = useState<FieldErrors<InventoryInput>>({});
  const [saving, setSaving] = useState<"save" | "another" | null>(null);
  // Only auto-suggest category/location/expiry for new items until the user picks them.
  const [touched, setTouched] = useState({ category: !isNew, location: !isNew, expiresOn: !isNew });

  const set = <K extends keyof InventoryInput>(key: K, value: InventoryInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const suggest = () => {
    if (!isNew || !values.name.trim()) return;
    const c = classifyFood(values.name);
    setValues((v) => ({
      ...v,
      category: touched.category ? v.category : c.category,
      location: touched.location ? v.location : c.location,
      expiresOn: touched.expiresOn ? v.expiresOn : c.shelfDays != null ? addDays(todayKey(), c.shelfDays) : null,
    }));
  };

  const submit = async (e: FormEvent, addAnother = false) => {
    e.preventDefault();
    const cleaned = { ...values, name: values.name.trim() };
    const errs = validateInventory(cleaned);
    setErrors(errs);
    if (hasErrors(errs)) {
      const first = Object.keys(errs).find((k) => errs[k as keyof InventoryInput]);
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSaving(addAnother ? "another" : "save");
    const ok = await onSubmit(cleaned, { addAnother });
    setSaving(null);
    if (ok && addAnother) {
      setValues(emptyInventoryInput(cleaned.location));
      setTouched({ category: false, location: false, expiresOn: false });
      document.querySelector<HTMLInputElement>('[name="name"]')?.focus();
    }
  };

  const quickDates = [
    { label: "+3 days", days: 3 },
    { label: "+1 week", days: 7 },
    { label: "+1 month", days: 30 },
  ];

  return (
    <form onSubmit={(e) => submit(e)} noValidate className="space-y-5">
      <Field label="Name" error={errors.name} hint={isNew ? "We'll suggest a category, location and expiry from the name." : undefined}>
        {(p) => (
          <Input
            {...p}
            name="name"
            autoComplete="off"
            autoFocus={isNew}
            placeholder="e.g. Greek yogurt"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            onBlur={() => {
              if (values.name && values.name === values.name.toLowerCase()) set("name", titleCase(values.name));
              suggest();
            }}
            maxLength={120}
            required
          />
        )}
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Location</legend>
        <div className="grid grid-cols-3 gap-2">
          {LOCATIONS.map((loc) => (
            <label
              key={loc}
              className={clsx(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary",
                values.location === loc ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name="location"
                value={loc}
                className="sr-only"
                checked={values.location === loc}
                onChange={() => {
                  set("location", loc);
                  setTouched((t) => ({ ...t, location: true }));
                }}
              />
              {LOCATION_LABELS[loc]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" error={errors.quantity}>
          {(p) => (
            <Input
              {...p}
              name="quantity"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={Number.isFinite(values.quantity) ? values.quantity : ""}
              onChange={(e) => set("quantity", e.target.value === "" ? NaN : Number(e.target.value))}
            />
          )}
        </Field>
        <Field label="Unit" error={errors.unit}>
          {(p) => (
            <Select {...p} name="unit" value={values.unit} onChange={(e) => set("unit", e.target.value as InventoryInput["unit"])}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Category" error={errors.category}>
        {(p) => (
          <Select
            {...p}
            name="category"
            value={values.category}
            onChange={(e) => {
              set("category", e.target.value as InventoryInput["category"]);
              setTouched((t) => ({ ...t, category: true }));
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div>
        <Field label="Expiry date (optional)" error={errors.expiresOn}>
          {(p) => (
            <Input
              {...p}
              name="expiresOn"
              type="date"
              value={values.expiresOn ?? ""}
              onChange={(e) => {
                set("expiresOn", e.target.value || null);
                setTouched((t) => ({ ...t, expiresOn: true }));
              }}
            />
          )}
        </Field>
        <div className="mt-2 flex flex-wrap gap-2">
          {quickDates.map((q) => (
            <Button
              key={q.label}
              size="sm"
              variant="secondary"
              onClick={() => {
                set("expiresOn", addDays(todayKey(), q.days));
                setTouched((t) => ({ ...t, expiresOn: true }));
              }}
            >
              {q.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              set("expiresOn", null);
              setTouched((t) => ({ ...t, expiresOn: true }));
            }}
          >
            No date
          </Button>
        </div>
      </div>

      <Field label="Low-stock alert at (optional)" error={errors.lowStockThreshold} hint="Shows on the dashboard when quantity drops to this level.">
        {(p) => (
          <Input
            {...p}
            name="lowStockThreshold"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={values.lowStockThreshold ?? ""}
            onChange={(e) => set("lowStockThreshold", e.target.value === "" ? null : Number(e.target.value))}
          />
        )}
      </Field>

      <Field label="Notes (optional)" error={errors.notes}>
        {(p) => <Textarea {...p} name="notes" maxLength={500} value={values.notes} onChange={(e) => set("notes", e.target.value)} />}
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {isNew && (
          <Button variant="secondary" type="button" onClick={(e) => submit(e, true)} loading={saving === "another"} disabled={!!saving}>
            Save &amp; add another
          </Button>
        )}
        <Button type="submit" loading={saving === "save"} disabled={!!saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
