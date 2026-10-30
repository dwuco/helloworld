"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PackageCheck, Plus, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, LinkButton, Notice, PageHeader, Select } from "@/components/ui";
import { approveImport, cancelImport, receiveImport } from "@/lib/actions";
import { getRetailer } from "@/lib/integrations";
import { buildImportLine } from "@/lib/receipt-parser";
import { CATEGORIES, FULFILLMENT_LABELS, FULFILLMENT_METHODS, LOCATION_LABELS, LOCATIONS, UNITS, type GroceryImport, type ImportLine } from "@/lib/types";
import { formatDate, plural, titleCase } from "@/lib/utils";

export default function ImportReviewPage() {
  return (
    <DataGate label="Loading import">
      <ImportReview />
    </DataGate>
  );
}

function ImportReview() {
  const { id } = useParams<{ id: string }>();
  const { data } = usePantry();
  const record = data.imports.find((i) => i.id === id);
  if (!record) {
    return (
      <EmptyState
        title="Import not found"
        description="It may have been deleted, possibly by someone else in your household."
        action={<LinkButton href="/import">Back to imports</LinkButton>}
      />
    );
  }
  return <ImportEditor key={record.id} record={record} />;
}

function LineEditor({ line, onChange, onRemove, readOnly }: { line: ImportLine; onChange(l: ImportLine): void; onRemove(): void; readOnly: boolean }) {
  const set = <K extends keyof ImportLine>(k: K, v: ImportLine[K]) => onChange({ ...line, [k]: v });
  return (
    <li className={clsx("rounded-2xl border bg-surface p-3", line.include ? "border-border" : "border-dashed border-border opacity-60")}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-7 size-5 shrink-0 accent-[var(--color-primary)]"
          checked={line.include}
          disabled={readOnly}
          onChange={(e) => set("include", e.target.checked)}
          aria-label={`Include ${line.name || "item"}`}
        />
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className="mb-0.5 block text-[11px] font-medium text-muted" htmlFor={`name-${line.id}`}>
              Item name
            </label>
            <Input id={`name-${line.id}`} value={line.name} disabled={readOnly} onChange={(e) => set("name", e.target.value)} aria-invalid={line.include && !line.name.trim() ? true : undefined} />
            {line.rawText && line.rawText !== line.name && <p className="mt-1 truncate font-mono text-[11px] text-muted" title={line.rawText}>{line.rawText}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-3">
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-muted" htmlFor={`qty-${line.id}`}>
                Quantity
              </label>
              <Input
                id={`qty-${line.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                disabled={readOnly}
                value={Number.isFinite(line.quantity) ? line.quantity : ""}
                onChange={(e) => set("quantity", e.target.value === "" ? NaN : Number(e.target.value))}
                aria-invalid={line.include && !(line.quantity > 0) ? true : undefined}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-muted" htmlFor={`unit-${line.id}`}>
                Unit
              </label>
              <Select id={`unit-${line.id}`} value={line.unit} disabled={readOnly} onChange={(e) => set("unit", e.target.value as ImportLine["unit"])}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-4">
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-muted" htmlFor={`loc-${line.id}`}>
                Location
              </label>
              <Select id={`loc-${line.id}`} value={line.location} disabled={readOnly} onChange={(e) => set("location", e.target.value as ImportLine["location"])}>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {LOCATION_LABELS[l]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-muted" htmlFor={`exp-${line.id}`}>
                Expires
              </label>
              <Input id={`exp-${line.id}`} type="date" disabled={readOnly} value={line.expiresOn ?? ""} onChange={(e) => set("expiresOn", e.target.value || null)} />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:col-span-12">
            <label className="sr-only" htmlFor={`cat-${line.id}`}>
              Category
            </label>
            <Select id={`cat-${line.id}`} className="!min-h-9 max-w-44 !py-1 text-sm" value={line.category} disabled={readOnly} onChange={(e) => set("category", e.target.value as ImportLine["category"])}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
            {line.price != null && <span className="text-xs text-muted">${line.price.toFixed(2)}</span>}
            {!readOnly && (
              <Button size="sm" variant="ghost" className="ml-auto text-danger" onClick={onRemove} aria-label={`Remove ${line.name || "line"}`}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function ImportEditor({ record }: { record: GroceryImport }) {
  const router = useRouter();
  const { data, mutate } = usePantry();
  const [draft, setDraft] = useState<GroceryImport>(record);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const retailer = getRetailer(draft.retailerId);
  const editable = draft.status === "review" || draft.status === "awaiting";
  const included = draft.lines.filter((l) => l.include);
  const invalid = included.some((l) => !l.name.trim() || !(l.quantity > 0));

  // Pick up changes made elsewhere (e.g. another household member) when we have no local edits.
  useEffect(() => {
    if (!dirty) setDraft(record);
  }, [record, dirty]);

  const update = (patch: Partial<GroceryImport>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const updateLine = (lineId: string, next: ImportLine) => update({ lines: draft.lines.map((l) => (l.id === lineId ? next : l)) });

  const run = async (label: string, fn: () => Promise<boolean>) => {
    setBusy(label);
    const ok = await fn();
    setBusy(null);
    if (ok) setDirty(false);
    return ok;
  };

  const save = () => run("save", async () => !!(await mutate((repo) => repo.saveImport(draft), { success: "Changes saved." })));

  const approve = () =>
    run("approve", async () => {
      const res = await mutate((repo) => approveImport(repo, draft, data.inventory), {
        success: (r) =>
          r.status === "received"
            ? `Added ${r.result!.added} new and updated ${r.result!.merged} existing items.`
            : `Saved. Confirm when your ${draft.fulfillment} arrives to add the items.`,
      });
      if (res?.status === "received") router.push("/inventory");
      return !!res;
    });

  const receive = () =>
    run("receive", async () => {
      const res = await mutate((repo) => receiveImport(repo, draft, data.inventory), {
        success: (r) => `Added ${r.added} new and updated ${r.merged} existing items.`,
      });
      if (res) router.push("/inventory");
      return !!res;
    });

  const FulfillIcon = draft.fulfillment === "delivery" ? Truck : PackageCheck;

  return (
    <div>
      <Link href="/import" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> All imports
      </Link>
      <PageHeader
        title={draft.status === "awaiting" ? `Confirm ${draft.fulfillment}` : draft.status === "review" ? "Review items" : "Import details"}
        description={
          <>
            {retailer.name}
            {draft.orderRef && ` · Order #${draft.orderRef}`} · imported {formatDate(draft.createdAt.slice(0, 10))}
          </>
        }
      />

      {draft.status === "awaiting" && (
        <Notice tone="warning" title={`Not in your inventory yet`} className="mb-4">
          When you have the order, untick anything that was out of stock, fix substitutions, then confirm. Only ticked items are added.
        </Notice>
      )}
      {draft.status === "received" && (
        <Notice tone="success" title="Added to inventory" className="mb-4">
          {draft.receivedAt && `Received ${new Date(draft.receivedAt).toLocaleString()}. `}Edit quantities from the Inventory page.
        </Notice>
      )}
      {draft.status === "cancelled" && (
        <Notice tone="neutral" title="Cancelled" className="mb-4">
          Nothing from this import was added to your inventory.
        </Notice>
      )}

      {editable && (
        <Card className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fulfillment">
              {(p) => (
                <Select {...p} value={draft.fulfillment} disabled={draft.status !== "review"} onChange={(e) => update({ fulfillment: e.target.value as GroceryImport["fulfillment"] })}>
                  {FULFILLMENT_METHODS.map((f) => (
                    <option key={f} value={f}>
                      {FULFILLMENT_LABELS[f]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {draft.fulfillment !== "in_store" && (
              <Field label={draft.fulfillment === "pickup" ? "Pickup date" : "Delivery date"}>
                {(p) => <Input {...p} type="date" value={draft.expectedOn ?? ""} onChange={(e) => update({ expectedOn: e.target.value || null })} />}
              </Field>
            )}
          </div>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Items <span className="text-sm font-normal text-muted">({included.length} of {draft.lines.length} selected)</span>
        </h2>
        {editable && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => update({ lines: draft.lines.map((l) => ({ ...l, include: true })) })}>
              Select all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => update({ lines: draft.lines.map((l) => ({ ...l, include: false })) })}>
              Select none
            </Button>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {draft.lines.map((line) => (
          <LineEditor
            key={line.id}
            line={line}
            readOnly={!editable}
            onChange={(next) => updateLine(line.id, next)}
            onRemove={() => update({ lines: draft.lines.filter((l) => l.id !== line.id) })}
          />
        ))}
      </ul>
      {draft.lines.length === 0 && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">No items. Add one below.</p>}

      {editable && (
        <Button variant="secondary" className="mt-3" onClick={() => update({ lines: [...draft.lines, { ...buildImportLine("New item"), name: "" }] })}>
          <Plus className="size-4" aria-hidden /> Add a line
        </Button>
      )}

      {invalid && editable && (
        <Notice tone="danger" className="mt-4">
          Every selected item needs a name and a quantity above 0.
        </Notice>
      )}

      {editable && (
        <div className="sticky bottom-20 z-10 mt-6 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
          <Button variant="ghost" className="text-danger" onClick={() => setConfirmCancel(true)} disabled={!!busy}>
            {draft.status === "awaiting" ? "Cancel order" : "Discard import"}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {dirty && (
              <Button variant="secondary" onClick={save} loading={busy === "save"} disabled={!!busy || invalid}>
                Save changes
              </Button>
            )}
            {draft.status === "review" ? (
              <Button onClick={approve} loading={busy === "approve"} disabled={!!busy || invalid || included.length === 0}>
                {draft.fulfillment === "in_store" ? (
                  `Add ${plural(included.length, "item")} to inventory`
                ) : (
                  <>
                    <FulfillIcon className="size-4" aria-hidden /> Save — waiting for {draft.fulfillment}
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={receive} loading={busy === "receive"} disabled={!!busy || invalid || included.length === 0}>
                <FulfillIcon className="size-4" aria-hidden />
                {draft.fulfillment === "delivery" ? "Delivered" : "Picked up"} — add {plural(included.length, "item")}
              </Button>
            )}
          </div>
        </div>
      )}

      {!editable && (
        <div className="mt-6 flex gap-2">
          <LinkButton href="/inventory">Go to inventory</LinkButton>
          <LinkButton href="/import" variant="secondary">
            New import
          </LinkButton>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title={draft.status === "awaiting" ? "Cancel this order?" : "Discard this import?"}
        message="Nothing will be added to your inventory. The record stays in your import history."
        confirmLabel={draft.status === "awaiting" ? "Cancel order" : "Discard"}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={async () => {
          setConfirmCancel(false);
          const ok = await run("cancel", async () => (await mutate((repo) => cancelImport(repo, draft).then(() => true), { success: "Import cancelled." })) ?? false);
          if (ok) router.push("/import");
        }}
      />
      {draft.status === "awaiting" && draft.expectedOn && (
        <p className="mt-3 text-center text-xs text-muted">
          <Badge tone="info">Expected {formatDate(draft.expectedOn, { weekday: "short", month: "short", day: "numeric" })}</Badge>
        </p>
      )}
    </div>
  );
}
