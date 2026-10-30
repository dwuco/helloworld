"use client";

import clsx from "clsx";
import Link from "next/link";
import { ChefHat, Clock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, EmptyState, Input, LinkButton, PageHeader } from "@/components/ui";
import { rankRecipes } from "@/lib/recipes";

type Filter = "all" | "ready" | "almost" | "expiring";

export default function RecipesPage() {
  return (
    <DataGate label="Matching recipes">
      <Recipes />
    </DataGate>
  );
}

function Recipes() {
  const { data } = usePantry();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const ranked = useMemo(() => rankRecipes(data.inventory, data.settings), [data.inventory, data.settings]);

  const visible = ranked.filter((m) => {
    if (filter === "ready" && m.missing.length > 0) return false;
    if (filter === "almost" && (m.missing.length === 0 || m.missing.length > 2)) return false;
    if (filter === "expiring" && m.usesExpiring === 0) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${m.recipe.title} ${m.recipe.tags.join(" ")} ${m.recipe.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts: Record<Filter, number> = {
    all: ranked.length,
    ready: ranked.filter((m) => m.missing.length === 0).length,
    almost: ranked.filter((m) => m.missing.length > 0 && m.missing.length <= 2).length,
    expiring: ranked.filter((m) => m.usesExpiring > 0).length,
  };
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "ready", label: "Ready to cook" },
    { key: "almost", label: "Missing 1–2" },
    { key: "expiring", label: "Uses expiring food" },
  ];

  return (
    <div>
      <PageHeader title="Find Recipes" description="Ranked by how much of each recipe you already have. Food that's about to expire gets priority." />

      {data.inventory.length === 0 && (
        <EmptyState
          icon={<ChefHat className="size-10" />}
          title="Add some food first"
          description="Recipes are matched against your inventory. Add a few items or load the sample kitchen to see what you can cook."
          action={
            <>
              <LinkButton href="/inventory/new">Add Food</LinkButton>
              <LinkButton href="/import" variant="secondary">
                Import Groceries
              </LinkButton>
            </>
          }
        />
      )}

      <div className="my-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <Input id="recipe-search" type="search" className="pl-9" placeholder="Search recipes, tags or ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="-mx-4 overflow-x-auto px-4">
          <div role="group" aria-label="Filter recipes" className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap",
                  filter === f.key ? "border-primary bg-primary text-on-primary" : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                {f.label}
                <span className={clsx("rounded-full px-1.5 text-xs", filter === f.key ? "bg-on-primary text-primary" : "bg-surface-2 text-muted")}>{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No recipes match" description="Try another filter, or add more ingredients to your inventory." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((m) => (
            <li key={m.recipe.id}>
              <Link href={`/recipes/${m.recipe.id}`} className="flex h-full flex-col rounded-2xl border border-border bg-surface p-4 hover:border-primary/50">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{m.recipe.title}</h2>
                  {m.missing.length === 0 ? <Badge tone="success">Ready</Badge> : <Badge tone={m.missing.length <= 2 ? "warning" : "neutral"}>Missing {m.missing.length}</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{m.recipe.description}</p>
                <div className="mt-3" aria-hidden>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${m.score}%` }} />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  You have {m.ownedRequiredCount} of {m.requiredCount} ingredients
                  {m.missing.length > 0 && m.missing.length <= 3 && <> · need {m.missing.map((i) => i.name).join(", ")}</>}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  <Badge>
                    <Clock className="size-3" aria-hidden /> {m.recipe.minutes} min
                  </Badge>
                  {m.usesExpiring > 0 && <Badge tone="warning">Uses {m.usesExpiring} expiring</Badge>}
                  {m.recipe.tags.slice(0, 2).map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
