"use client";

import clsx from "clsx";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, Button, Dialog, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { addToShoppingList } from "@/lib/actions";
import { getRecipe, matchRecipe, rankRecipes } from "@/lib/recipes";
import { MEAL_SLOTS, SLOT_LABELS, type MealPlanEntry, type MealPlanInput } from "@/lib/types";
import { addDays, formatDate, normalizeName, startOfWeek, todayKey } from "@/lib/utils";
import { hasErrors, validateMeal, type FieldErrors } from "@/lib/validation";

export default function MealPlanPage() {
  return (
    <DataGate label="Loading meal plan">
      <MealPlanner />
    </DataGate>
  );
}

const CUSTOM = "__custom__";

function MealDialog({
  open,
  initial,
  editing,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: MealPlanInput;
  editing: boolean;
  onClose(): void;
  onSave(input: MealPlanInput): Promise<boolean>;
  onDelete?(): Promise<void>;
}) {
  const { data } = usePantry();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<MealPlanInput>>({});
  const [busy, setBusy] = useState(false);
  const ranked = useMemo(() => rankRecipes(data.inventory, data.settings), [data.inventory, data.settings]);

  const save = async () => {
    const errs = validateMeal(values);
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    const ok = await onSave({ ...values, title: values.title.trim() });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit meal" : "Add meal"}
      footer={
        <>
          {editing && onDelete && (
            <Button variant="ghost" className="mr-auto text-danger" onClick={() => void onDelete()}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? "Save" : "Add meal"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" error={errors.date}>
            {(p) => <Input {...p} type="date" value={values.date} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} />}
          </Field>
          <Field label="Meal" error={errors.slot}>
            {(p) => (
              <Select {...p} value={values.slot} onChange={(e) => setValues((v) => ({ ...v, slot: e.target.value as MealPlanInput["slot"] }))}>
                {MEAL_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {SLOT_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Recipe" hint="Sorted by what you can make with your inventory.">
          {(p) => (
            <Select
              {...p}
              value={values.recipeId ?? CUSTOM}
              onChange={(e) => {
                const id = e.target.value;
                if (id === CUSTOM) setValues((v) => ({ ...v, recipeId: null, title: v.recipeId ? "" : v.title }));
                else {
                  const r = getRecipe(id);
                  setValues((v) => ({ ...v, recipeId: id, title: r?.title ?? v.title, servings: r?.servings ?? v.servings }));
                }
              }}
            >
              <option value={CUSTOM}>Custom meal (type a name)</option>
              {ranked.map((m) => (
                <option key={m.recipe.id} value={m.recipe.id}>
                  {m.recipe.title} {m.missing.length === 0 ? "· ready" : `· missing ${m.missing.length}`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {!values.recipeId && (
          <Field label="Meal name" error={errors.title}>
            {(p) => <Input {...p} placeholder="e.g. Leftovers, Takeout, Grandma's lasagna" value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} maxLength={120} />}
          </Field>
        )}
        <Field label="Servings" error={errors.servings}>
          {(p) => <Input {...p} type="number" inputMode="numeric" min={1} value={values.servings} onChange={(e) => setValues((v) => ({ ...v, servings: Number(e.target.value) }))} />}
        </Field>
        <Field label="Notes (optional)">{(p) => <Textarea {...p} rows={2} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />}</Field>
      </div>
    </Dialog>
  );
}

function MealPlanner() {
  const { data, mutate } = usePantry();
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [dialog, setDialog] = useState<{ entry: MealPlanEntry | null; initial: MealPlanInput } | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6]!;
  const weekMeals = data.mealPlan.filter((m) => m.date >= weekStart && m.date <= weekEnd);

  const missingForWeek = useMemo(() => {
    const seen = new Map<string, { name: string; source: string }>();
    for (const m of weekMeals) {
      const r = m.recipeId ? getRecipe(m.recipeId) : undefined;
      if (!r) continue;
      for (const ing of matchRecipe(r, data.inventory, data.settings).missing) {
        const key = normalizeName(ing.name);
        if (!seen.has(key)) seen.set(key, { name: ing.name, source: r.title });
      }
    }
    return [...seen.values()];
  }, [weekMeals, data.inventory, data.settings]);

  const openNew = (date: string) =>
    setDialog({ entry: null, initial: { date, slot: "dinner", recipeId: null, title: "", servings: data.settings.defaultServings, notes: "" } });
  const openEdit = (entry: MealPlanEntry) =>
    setDialog({ entry, initial: { date: entry.date, slot: entry.slot, recipeId: entry.recipeId, title: entry.title, servings: entry.servings, notes: entry.notes } });

  const slotOrder = (s: MealPlanEntry["slot"]) => MEAL_SLOTS.indexOf(s);

  return (
    <div>
      <PageHeader
        title="Meal Planner"
        description="Plan the week and send what you're missing straight to the shopping list."
        actions={
          <Button onClick={() => openNew(today >= weekStart && today <= weekEnd ? today : weekStart)}>
            <Plus className="size-4" aria-hidden /> Add meal
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-2">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <div className="text-center">
          <p className="font-semibold" aria-live="polite">
            {formatDate(weekStart)} – {formatDate(weekEnd)}
          </p>
          {weekStart !== startOfWeek(today) && (
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setWeekStart(startOfWeek(today))}>
              Back to this week
            </button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </div>

      {weekMeals.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 rounded-2xl bg-surface-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            {weekMeals.length} meal{weekMeals.length === 1 ? "" : "s"} planned ·{" "}
            {missingForWeek.length === 0 ? "you have every required ingredient" : `${missingForWeek.length} ingredient${missingForWeek.length === 1 ? "" : "s"} missing`}
          </p>
          {missingForWeek.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                mutate((repo) => addToShoppingList(repo, missingForWeek, data.shopping), {
                  success: (r) => (r.added ? `Added ${r.added} item${r.added === 1 ? "" : "s"} to your shopping list.` : "Everything is already on your list."),
                })
              }
            >
              <ShoppingCart className="size-4" aria-hidden /> Add missing to shopping list
            </Button>
          )}
        </div>
      )}

      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => {
          const meals = weekMeals.filter((m) => m.date === day).sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot));
          const isToday = day === today;
          return (
            <li key={day} className={clsx("rounded-2xl border bg-surface p-3", isToday ? "border-primary" : "border-border")} aria-current={isToday ? "date" : undefined}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">
                  {formatDate(day, { weekday: "long" })} <span className="font-normal text-muted">{formatDate(day)}</span>
                </h2>
                {isToday && <Badge tone="success">Today</Badge>}
              </div>
              {meals.length === 0 ? (
                <p className="py-2 text-sm text-muted">Nothing planned.</p>
              ) : (
                <ul className="space-y-1.5">
                  {meals.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{SLOT_LABELS[m.slot]}</p>
                        {m.recipeId ? (
                          <Link href={`/recipes/${m.recipeId}`} className="block truncate text-sm font-medium hover:underline">
                            {m.title}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium">{m.title}</p>
                        )}
                        {m.notes && <p className="truncate text-xs text-muted">{m.notes}</p>}
                      </div>
                      <Button size="sm" variant="ghost" className="!px-2" aria-label={`Edit ${m.title} on ${formatDate(day, { weekday: "long" })}`} onClick={() => openEdit(m)}>
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button size="sm" variant="ghost" className="mt-2 w-full text-primary" onClick={() => openNew(day)} aria-label={`Add meal on ${formatDate(day, { weekday: "long", month: "short", day: "numeric" })}`}>
                <Plus className="size-4" aria-hidden /> Add
              </Button>
            </li>
          );
        })}
      </ol>

      {data.mealPlan.length === 0 && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
          <CalendarDays className="size-4" aria-hidden /> Tip: open any recipe and choose “Add to meal plan”.
        </p>
      )}

      {dialog && (
        <MealDialog
          key={dialog.entry?.id ?? `new-${dialog.initial.date}`}
          open
          editing={!!dialog.entry}
          initial={dialog.initial}
          onClose={() => setDialog(null)}
          onSave={async (input) => {
            const entry = dialog.entry;
            const res = entry
              ? await mutate((repo) => repo.updateMeal(entry.id, input), { success: "Meal updated." })
              : await mutate((repo) => repo.createMeal(input), { success: `Added ${input.title}.` });
            return !!res;
          }}
          onDelete={
            dialog.entry
              ? async () => {
                  const entry = dialog.entry!;
                  await mutate((repo) => repo.deleteMeal(entry.id), { success: "Meal removed." });
                  setDialog(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
