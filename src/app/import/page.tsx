"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Info, PackageCheck, ReceiptText, ShieldCheck, Trash2, Truck, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, Button, Card, ConfirmDialog, Field, Input, LinkButton, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { RETAILERS, detectRetailer, getRetailer } from "@/lib/integrations";
import { extractEmailText, parseReceipt } from "@/lib/receipt-parser";
import { FULFILLMENT_LABELS, FULFILLMENT_METHODS, type FulfillmentMethod, type GroceryImport, type ImportSource } from "@/lib/types";
import { addDays, createId, formatDate, nowIso, todayKey } from "@/lib/utils";

const EXAMPLE = `Walmart pickup order
Order #2000123-45678
Great Value Large White Eggs, 18 ct  Qty 1  $3.84
Bananas, each  Qty 6  $1.50
Marketside Baby Spinach 5 oz  Qty 1  $2.48
Great Value Whole Milk, 1 gal  Qty 1  $3.12
Frozen Mixed Vegetables 12 oz  Qty 2  $2.24
Subtotal $13.18
Tax $0.00
Total $13.18`;

const MAX_FILE_BYTES = 1_000_000;

export default function ImportPage() {
  return (
    <DataGate label="Loading imports">
      <ImportHub />
    </DataGate>
  );
}

function statusBadge(imp: GroceryImport) {
  switch (imp.status) {
    case "review":
      return <Badge tone="info">Needs review</Badge>;
    case "awaiting":
      return <Badge tone="warning">{imp.fulfillment === "delivery" ? "Awaiting delivery" : "Awaiting pickup"}</Badge>;
    case "received":
      return <Badge tone="success">Added to inventory</Badge>;
    case "cancelled":
      return <Badge>Cancelled</Badge>;
  }
}

function ImportHub() {
  const router = useRouter();
  const { data, mutate } = usePantry();
  const [method, setMethod] = useState<"paste" | "file">("paste");
  const [text, setText] = useState("");
  const [source, setSource] = useState<ImportSource>("paste");
  const [fileName, setFileName] = useState<string | null>(null);
  const [retailerId, setRetailerId] = useState("other");
  const [retailerTouched, setRetailerTouched] = useState(false);
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("in_store");
  const [fulfillmentTouched, setFulfillmentTouched] = useState(false);
  const [expectedOn, setExpectedOn] = useState(addDays(todayKey(), 1));
  const [error, setError] = useState<string | null>(null);
  const [skippedPreview, setSkippedPreview] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GroceryImport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const retailer = getRetailer(retailerId);

  const applyDetected = (value: string) => {
    if (!retailerTouched) {
      const detected = detectRetailer(value);
      if (detected) setRetailerId(detected);
    }
    if (!fulfillmentTouched) {
      const parsed = parseReceipt(value);
      if (parsed.detectedFulfillment) setFulfillment(parsed.detectedFulfillment);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is larger than 1 MB. Copy the item list and paste it instead.");
      return;
    }
    if (/^image\//.test(file.type) || /\.(pdf|heic|jpe?g|png)$/i.test(file.name)) {
      setError("Photos and PDFs can't be read yet (no OCR in this version). Use a .txt, .csv or .eml file, or paste the text.");
      return;
    }
    try {
      const raw = await file.text();
      const isEmail = /\.eml$/i.test(file.name) || file.type === "message/rfc822";
      const content = isEmail ? extractEmailText(raw) : raw;
      setText(content);
      setSource(isEmail ? "email_file" : "file");
      setFileName(file.name);
      applyDetected(content);
    } catch {
      setError("Couldn't read that file. Make sure it's a plain-text receipt, CSV or saved email (.eml).");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSkippedPreview([]);
    if (!text.trim()) {
      setError(method === "file" ? "Choose a file first." : "Paste or type at least one item.");
      return;
    }
    const parsed = parseReceipt(text);
    if (parsed.lines.length === 0) {
      setError("We couldn't find any grocery items in that text. Try one item per line, e.g. “2 x Avocados 3.98”.");
      setSkippedPreview(parsed.skipped.slice(0, 8));
      return;
    }
    setBusy(true);
    const now = nowIso();
    const record: GroceryImport = {
      id: createId(),
      retailerId,
      source: method === "paste" ? "paste" : source,
      status: "review",
      fulfillment,
      expectedOn: fulfillment === "in_store" ? null : expectedOn || null,
      orderRef: parsed.orderRef,
      lines: parsed.lines,
      receivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await mutate((repo) => repo.saveImport(record));
    setBusy(false);
    if (saved) router.push(`/import/${saved.id}`);
  };

  const active = data.imports.filter((i) => i.status === "review" || i.status === "awaiting");
  const history = data.imports
    .filter((i) => i.status === "received" || i.status === "cancelled")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      <PageHeader title="Import Groceries" description="Turn a receipt or order confirmation into inventory in a few taps." />

      <Notice tone="success" className="mb-5 flex gap-2">
        <span className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Text is parsed on this device. PantryIQ never connects to your email or store accounts. You review every line before anything is added.
          </span>
        </span>
      </Notice>

      {active.length > 0 && (
        <section aria-labelledby="active-heading" className="mb-6">
          <h2 id="active-heading" className="mb-3 text-lg font-semibold">
            In progress
          </h2>
          <ul className="space-y-2">
            {active.map((imp) => (
              <li key={imp.id}>
                <Card className="flex flex-wrap items-center gap-3 !p-4">
                  {imp.fulfillment === "delivery" ? <Truck className="size-5 text-info" aria-hidden /> : <PackageCheck className="size-5 text-info" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {getRetailer(imp.retailerId).name}
                      {imp.orderRef && <span className="text-muted"> · #{imp.orderRef}</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {statusBadge(imp)}
                      {imp.lines.filter((l) => l.include).length} items
                      {imp.expectedOn && imp.status === "awaiting" && ` · expected ${formatDate(imp.expectedOn)}`}
                    </p>
                  </div>
                  <LinkButton href={`/import/${imp.id}`} size="sm" variant={imp.status === "awaiting" ? "primary" : "secondary"}>
                    {imp.status === "awaiting" ? "Confirm arrival" : "Continue review"}
                  </LinkButton>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card>
        <h2 className="text-lg font-semibold">New import</h2>
        <form onSubmit={submit} className="mt-4 space-y-5" noValidate>
          <Field label="Store">
            {(p) => (
              <Select
                {...p}
                value={retailerId}
                onChange={(e) => {
                  setRetailerId(e.target.value);
                  setRetailerTouched(true);
                }}
              >
                {RETAILERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <details className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">How to get your {retailer.name} item list</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
              {retailer.importSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted">
              Automatic sync isn&apos;t available.{" "}
              <Link href="/settings/integrations" className="font-medium text-primary underline">
                Why?
              </Link>
            </p>
          </details>

          <div>
            <div role="tablist" aria-label="Import method" className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "paste", label: "Paste or type", icon: ClipboardPaste },
                  { key: "file", label: "Upload file", icon: Upload },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`tab-${key}`}
                  aria-selected={method === key}
                  aria-controls={`panel-${key}`}
                  onClick={() => {
                    setMethod(key);
                    setError(null);
                  }}
                  className={clsx(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium",
                    method === key ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`panel-${method}`} aria-labelledby={`tab-${method}`} className="mt-3">
              {method === "file" && (
                <div className="mb-3 rounded-xl border border-dashed border-border p-4 text-center">
                  <input ref={fileRef} id="receipt-file" type="file" accept=".txt,.csv,.eml,text/plain,text/csv,message/rfc822" className="sr-only" onChange={onFile} />
                  <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                    <Upload className="size-4" aria-hidden /> Choose .txt, .csv or .eml file
                  </Button>
                  <p className="mt-2 text-xs text-muted">
                    {fileName ? `Loaded ${fileName}. Check the text below.` : "Tip: save an order confirmation email as .eml (in most mail apps: Save as / Download message)."}
                  </p>
                </div>
              )}
              <Field
                label={method === "file" ? "File contents" : "Receipt or order text"}
                hint="One item per line works best. Totals, tax, payment and address lines are ignored automatically."
              >
                {(p) => (
                  <Textarea
                    {...p}
                    rows={9}
                    className="font-mono text-sm"
                    placeholder={"2 x Avocados 3.98\nWhole milk 1 gal 3.49\nChicken breast 2.1 lb 8.37"}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      applyDetected(e.target.value);
                    }}
                  />
                )}
              </Field>
              {method === "paste" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => {
                    setText(EXAMPLE);
                    applyDetected(EXAMPLE);
                  }}
                >
                  Fill in an example receipt
                </Button>
              )}
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">How did you get it?</legend>
            <div className="grid grid-cols-3 gap-2">
              {FULFILLMENT_METHODS.map((f) => (
                <label
                  key={f}
                  className={clsx(
                    "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary",
                    fulfillment === f ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value={f}
                    className="sr-only"
                    checked={fulfillment === f}
                    onChange={() => {
                      setFulfillment(f);
                      setFulfillmentTouched(true);
                    }}
                  />
                  {f === "in_store" ? "In store" : FULFILLMENT_LABELS[f]}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {fulfillment === "in_store"
                ? "Items go into inventory as soon as you approve them."
                : `Items wait until you confirm the ${fulfillment} arrived, so out-of-stock or substituted items don't end up in your inventory.`}
            </p>
          </fieldset>

          {fulfillment !== "in_store" && (
            <Field label={fulfillment === "pickup" ? "Pickup date" : "Delivery date"}>
              {(p) => <Input {...p} type="date" value={expectedOn} onChange={(e) => setExpectedOn(e.target.value)} />}
            </Field>
          )}

          {error && (
            <Notice tone="danger" title="Nothing to import yet">
              <p>{error}</p>
              {skippedPreview.length > 0 && (
                <>
                  <p className="mt-2 font-medium">Lines we ignored:</p>
                  <ul className="mt-1 list-disc pl-5 font-mono text-xs">
                    {skippedPreview.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
            </Notice>
          )}

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto">
              <ReceiptText className="size-4" aria-hidden /> Review items
            </Button>
          </div>
        </form>
      </Card>

      <Notice tone="neutral" className="mt-4">
        <span className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Photo receipts and automatic email or store sync aren&apos;t supported in this version.{" "}
            <Link href="/settings/integrations" className="font-medium text-primary underline">
              See integration status
            </Link>
            .
          </span>
        </span>
      </Notice>

      {history.length > 0 && (
        <section aria-labelledby="history-heading" className="mt-8">
          <h2 id="history-heading" className="mb-3 text-lg font-semibold">
            History
          </h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {history.map((imp) => (
              <li key={imp.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/import/${imp.id}`} className="font-medium hover:underline">
                    {getRetailer(imp.retailerId).name} · {imp.lines.filter((l) => l.include).length} items
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {statusBadge(imp)} {formatDate(imp.updatedAt.slice(0, 10))}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-danger" aria-label="Delete import record" onClick={() => setPendingDelete(imp)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete import record?"
        message="This removes the record only. Items already added to your inventory stay there."
        confirmLabel="Delete record"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await mutate((repo) => repo.deleteImport(pendingDelete.id), { success: "Import record deleted." });
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
