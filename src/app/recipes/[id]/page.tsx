"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarPlus, Check, Clock, ShoppingCart, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, Button, Card, Dialog, EmptyState, Field, Input, LinkButton, Select } from "@/components/ui";
import { addToShoppingList } from "@/lib/actions";
import { getRecipe, matchRecipe } from "@/lib/recipes";
import { LOCATION_LABELS, MEAL_SLOTS, SLOT_LABELS, type MealSlot } from "@/lib/types";
import { describeExpiry, expiryState, todayKey } from "@/lib/utils";

export default function RecipeDetailPage() {
  return (
    <DataGate label="Loading recipe">
      <RecipeDetail />
    </DataGate>
  );
}

function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, mutate } = usePantry();
  const recipe = getRecipe(id);
  const match = useMemo(() => (recipe ? matchRecipe(recipe, data.inventory, data.settings) : null), [recipe, data.inventory, data.settings]);
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState(todayKey());
  const [planSlot, setPlanSlot] = useState<MealSlot>("dinner");
  const [planServings, setPlanServings] = useState(recipe?.servings ?? data.settings.defaultServings);
  const [busy, setBusy] = useState(false);

  if (!recipe || !match) {
    return <EmptyState title="Recipe not found" action={<LinkButton href="/recipes">Back to recipes</LinkButton>} />;
  }

  const addMissing = () =>
    mutate((repo) => addToShoppingList(repo, match.missing.map((i) => ({ name: i.name, source: recipe.title })), data.shopping), {
      success: (r) => (r.added ? `Added ${r.added} item${r.added === 1 ? "" : "s"} to your shopping list.` : "Everything is already on your list."),
    });

  const addToPlan = async () => {
    setBusy(true);
    const ok = await mutate(
      (repo) => repo.createMeal({ date: planDate, slot: planSlot, recipeId: recipe.id, title: recipe.title, servings: planServings, notes: "" }),
      { success: `Planned ${recipe.title}.` },
    );
    setBusy(false);
    if (ok) setPlanOpen(false);
  };

  return (
    <div>
      <Link href="/recipes" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> All recipes
      </Link>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{recipe.title}</h1>
      <p className="mt-1 text-muted">{recipe.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge>
          <Clock className="size-3" aria-hidden /> {recipe.minutes} min
        </Badge>
        <Badge>
          <Users className="size-3" aria-hidden /> Serves {recipe.servings}
        </Badge>
        {match.missing.length === 0 ? <Badge tone="success">You have everything</Badge> : <Badge tone="warning">Missing {match.missing.length}</Badge>}
        {recipe.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => setPlanOpen(true)}>
          <CalendarPlus className="size-4" aria-hidden /> Add to meal plan
        </Button>
        {match.missing.length > 0 && (
          <Button variant="secondary" onClick={addMissing}>
            <ShoppingCart className="size-4" aria-hidden /> Add {match.missing.length} missing to shopping list
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-2">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <ul className="mt-3 space-y-2.5">
            {match.ingredients.map(({ ingredient, owned, item, assumedStaple }) => {
              const state = item ? expiryState(item.expiresOn, data.settings.expiringSoonDays) : "none";
              return (
                <li key={ingredient.text} className="flex items-start gap-2 text-sm">
                  {owned ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-label="You have this" />
                  ) : (
                    <X className={ingredient.optional ? "mt-0.5 size-4 shrink-0 text-muted" : "mt-0.5 size-4 shrink-0 text-danger"} aria-label="Missing" />
                  )}
                  <span className="min-w-0">
                    <span className={owned ? "" : ingredient.optional ? "text-muted" : "font-medium"}>{ingredient.text}</span>
                    {ingredient.optional && <span className="text-xs text-muted"> (optional)</span>}
                    {item && (
                      <span className="block text-xs text-muted">
                        {item.name} · {LOCATION_LABELS[item.location]}
                        {(state === "soon" || state === "expired") && <span className="text-warning"> · {describeExpiry(item.expiresOn)}</span>}
                      </span>
                    )}
                    {assumedStaple && <span className="block text-xs text-muted">Assumed pantry staple</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="md:col-span-3">
          <h2 className="text-lg font-semibold">Steps</h2>
          <ol className="mt-3 space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-strong" aria-hidden>
                  {i + 1}
                </span>
                <span className="pt-0.5">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Dialog
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title={`Plan ${recipe.title}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPlanOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addToPlan} loading={busy} disabled={!planDate || planServings < 1}>
              Add to plan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Date">{(p) => <Input {...p} type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />}</Field>
          <Field label="Meal">
            {(p) => (
              <Select {...p} value={planSlot} onChange={(e) => setPlanSlot(e.target.value as MealSlot)}>
                {MEAL_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {SLOT_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Servings">
            {(p) => <Input {...p} type="number" min={1} inputMode="numeric" value={planServings} onChange={(e) => setPlanServings(Number(e.target.value))} />}
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
