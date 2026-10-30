"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Store } from "lucide-react";
import { DataGate } from "@/components/data-gate";
import { usePantry } from "@/components/pantry-provider";
import { Badge, Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { EMAIL_PROVIDERS, RETAILERS, STATUS_LABELS, type IntegrationStatus } from "@/lib/integrations";

const tone = (s: IntegrationStatus) => (s === "available" ? "success" : s === "manual_import" ? "info" : "neutral");

export default function IntegrationsPage() {
  return (
    <DataGate>
      <Integrations />
    </DataGate>
  );
}

function Integrations() {
  const { data } = usePantry();
  const optedIn = data.settings.emailConsent.optedIn;
  return (
    <div>
      <Link href="/settings" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Settings
      </Link>
      <PageHeader title="Integrations" description="What connects automatically, what doesn't, and why." />

      <Notice tone="info" title="What works today" className="mb-6">
        Importing from <strong>any</strong> store by pasting receipt or order text, uploading a .txt/.csv file, or uploading a saved order email (.eml).
        Nothing on this page syncs automatically, and PantryIQ never asks for store passwords.
      </Notice>

      <section aria-labelledby="email-int-heading" className="mb-8">
        <h2 id="email-int-heading" className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Mail className="size-5 text-muted" aria-hidden /> Email
        </h2>
        <p className="mb-3 text-sm text-muted">
          Strictly opt-in. Your preference:{" "}
          <Link href="/settings#email" className="font-medium text-primary underline">
            {optedIn ? "opted in" : "off (default)"}
          </Link>
          .
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EMAIL_PROVIDERS.map((p) => (
            <li key={p.id}>
              <Card className="h-full">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge tone={tone(p.status)}>{STATUS_LABELS[p.status]}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{p.statusReason}</p>
                <p className="mt-2 text-xs text-muted">
                  Planned read-only scope: <code className="break-all">{p.plannedScopes.join(", ")}</code>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="retail-int-heading">
        <h2 id="retail-int-heading" className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Store className="size-5 text-muted" aria-hidden /> Stores
        </h2>
        <p className="mb-3 text-sm text-muted">
          None of these retailers offer a public API for your personal order history, so PantryIQ supports them through manual import.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {RETAILERS.map((r) => (
            <li key={r.id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{r.name}</h3>
                  <Badge tone={tone(r.status)}>{STATUS_LABELS[r.status]}</Badge>
                </div>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
                  {r.importSteps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-muted">
                  {[r.fulfillment.pickup && "Pickup", r.fulfillment.delivery && "Delivery"].filter(Boolean).join(" & ")} orders can be held until you confirm they arrived.
                </p>
                <div className="mt-auto pt-3">
                  <LinkButton href="/import" size="sm" variant="secondary">
                    Import from {r.id === "other" ? "a receipt" : r.name}
                  </LinkButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
