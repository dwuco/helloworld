"use client";

import Link from "next/link";
import { ChevronRight, Cloud, Copy, Download, HardDrive, LogOut, Mail, Upload, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { DataGate } from "@/components/data-gate";
import { errorMessage, usePantry } from "@/components/pantry-provider";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ConfirmDialog, Dialog, Field, Input, Notice, PageHeader } from "@/components/ui";
import { loadSampleData } from "@/lib/actions";
import { createBackup, parseBackup, restoreBackup } from "@/lib/backup";
import { EMAIL_PROVIDERS } from "@/lib/integrations";
import { LocalRepository } from "@/lib/repository/local";
import { getSupabase } from "@/lib/supabase/client";
import {
  createHousehold,
  createInvite,
  joinHousehold,
  leaveHousehold,
  listMembers,
  sendMagicLink,
  signOut,
  type HouseholdMember,
} from "@/lib/supabase/household";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  return (
    <DataGate label="Loading settings">
      <div>
        <PageHeader title="Settings" description="Household, sync, privacy and data." />
        <div className="space-y-6">
          <HouseholdSection />
          <PreferencesSection />
          <EmailSection />
          <Link href="/settings/integrations" className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2 sm:p-5">
            <span>
              <span className="block text-lg font-semibold">Integrations</span>
              <span className="text-sm text-muted">Status of Walmart, Sam&apos;s Club, Costco, Gmail, Outlook and other connections</span>
            </span>
            <ChevronRight className="size-5 text-muted" aria-hidden />
          </Link>
          <DataSection />
        </div>
      </div>
    </DataGate>
  );
}

function SectionTitle({ id, children, badge }: { id: string; children: string; badge?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h2 id={id} className="text-lg font-semibold">
        {children}
      </h2>
      {badge}
    </div>
  );
}

function HouseholdSection() {
  const { mode, auth, refreshAuth } = usePantry();
  const toast = useToast();
  const db = getSupabase();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("Our household");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (!db || mode.kind !== "supabase") return;
    let cancelled = false;
    listMembers(db, mode.householdId)
      .then((m) => !cancelled && setMembers(m))
      .catch((e) => !cancelled && setMembersError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [db, mode]);

  const attempt = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (mode.kind === "supabase" && db) {
    return (
      <Card aria-labelledby="household-heading" id="household">
        <SectionTitle id="household-heading" badge={<Badge tone="success"><Cloud className="size-3" aria-hidden /> Synced</Badge>}>
          Household
        </SectionTitle>
        <p className="text-sm">
          <strong>{mode.householdName}</strong> · signed in as {mode.email ?? "unknown"} ({mode.role})
        </p>
        <p className="mt-1 text-sm text-muted">Inventory, shopping list, meal plan and imports are shared with every member and update live.</p>

        <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" aria-hidden /> Members
        </h3>
        {membersError ? (
          <p className="mt-2 text-sm text-danger">{membersError}</p>
        ) : members == null ? (
          <p className="mt-2 text-sm text-muted" role="status">
            Loading members…
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-2">
                {m.email ?? "Member"} {m.role === "owner" && <Badge>Owner</Badge>} {m.userId === mode.userId && <Badge tone="info">You</Badge>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 rounded-xl bg-surface-2 p-4">
          <p className="text-sm font-medium">Invite someone</p>
          <p className="text-xs text-muted">Codes expire after 7 days. They sign in, choose “Join a household” and enter the code.</p>
          {invite ? (
            <div className="mt-3 flex items-center gap-2">
              <code className="rounded-lg bg-surface px-3 py-2 font-mono text-lg tracking-widest" aria-label="Invite code">
                {invite}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigator.clipboard?.writeText(invite).then(() => toast.success("Copied."), () => toast.error("Couldn't copy. Select the code instead."))}
              >
                <Copy className="size-4" aria-hidden /> Copy
              </Button>
            </div>
          ) : (
            <Button className="mt-3" size="sm" variant="secondary" loading={busy === "invite"} onClick={() => attempt("invite", async () => setInvite(await createInvite(db, mode.householdId)))}>
              Create invite code
            </Button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" loading={busy === "signout"} onClick={() => attempt("signout", async () => { await signOut(db); await refreshAuth(); })}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Button>
          <Button variant="ghost" className="text-danger" onClick={() => setConfirmLeave(true)}>
            Leave household
          </Button>
        </div>
        <ConfirmDialog
          open={confirmLeave}
          title="Leave this household?"
          message="You'll lose access to its shared data. The household and its data stay for other members."
          confirmLabel="Leave"
          busy={busy === "leave"}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() =>
            attempt("leave", async () => {
              await leaveHousehold(db, mode.householdId, mode.userId);
              setConfirmLeave(false);
              await refreshAuth();
              toast.success("You left the household.");
            })
          }
        />
      </Card>
    );
  }

  return (
    <Card aria-labelledby="household-heading" id="household">
      <SectionTitle id="household-heading" badge={<Badge><HardDrive className="size-3" aria-hidden /> This device only</Badge>}>
        Household &amp; sync
      </SectionTitle>
      <p className="text-sm">
        Your data is saved in this browser on this device. It isn&apos;t backed up or shared. Use <em>Export backup</em> below to keep a copy.
      </p>

      {!auth.configured || !db ? (
        <Notice tone="neutral" className="mt-4" title="Shared households aren't enabled on this deployment">
          Sharing needs a Supabase project. Whoever runs this app can enable it by setting <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (see the README).
        </Notice>
      ) : !auth.session ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(email)) {
              toast.error("Enter a valid email address.");
              return;
            }
            void attempt("signin", async () => {
              await sendMagicLink(db, email.trim(), `${window.location.origin}/settings#household`);
              setSent(true);
            });
          }}
        >
          <p className="text-sm font-medium">Sign in to share a household with family or roommates</p>
          {sent ? (
            <Notice tone="success" title="Check your email">
              We sent a sign-in link to {email}. Open it on this device to finish signing in.
            </Notice>
          ) : (
            <>
              <Field label="Email address" hint="We email you a one-time sign-in link. This does not give PantryIQ any access to your inbox.">
                {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
              </Field>
              <Button type="submit" loading={busy === "signin"}>
                Email me a sign-in link
              </Button>
            </>
          )}
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm">
            Signed in as <strong>{auth.session.user.email}</strong>. Create a household or join one with an invite code.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <form
              className="space-y-2 rounded-xl bg-surface-2 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void attempt("create", async () => {
                  await createHousehold(db, newName);
                  await refreshAuth();
                  toast.success("Household created. Your data now syncs.");
                });
              }}
            >
              <Field label="New household name">{(p) => <Input {...p} value={newName} maxLength={80} onChange={(e) => setNewName(e.target.value)} />}</Field>
              <Button type="submit" size="sm" loading={busy === "create"}>
                Create household
              </Button>
            </form>
            <form
              className="space-y-2 rounded-xl bg-surface-2 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!code.trim()) return;
                void attempt("join", async () => {
                  await joinHousehold(db, code);
                  await refreshAuth();
                  toast.success("Joined household.");
                });
              }}
            >
              <Field label="Invite code">{(p) => <Input {...p} value={code} autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} />}</Field>
              <Button type="submit" size="sm" variant="secondary" loading={busy === "join"}>
                Join household
              </Button>
            </form>
          </div>
          <p className="text-xs text-muted">Data on this device isn&apos;t moved automatically. After joining, use Export backup here and Restore backup in the household.</p>
          <Button variant="ghost" size="sm" onClick={() => attempt("signout", async () => { await signOut(db); await refreshAuth(); })}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Button>
        </div>
      )}
    </Card>
  );
}

function PreferencesSection() {
  const { data, mutate } = usePantry();
  const [values, setValues] = useState<Settings>(data.settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setValues(data.settings), [data.settings]);
  const dirty = JSON.stringify(values) !== JSON.stringify(data.settings);

  return (
    <Card aria-labelledby="prefs-heading">
      <SectionTitle id="prefs-heading">Preferences</SectionTitle>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!values.householdName.trim()) return;
          setBusy(true);
          await mutate((repo) => repo.saveSettings({ ...data.settings, ...values, householdName: values.householdName.trim(), emailConsent: data.settings.emailConsent }), {
            success: "Preferences saved.",
          });
          setBusy(false);
        }}
      >
        <Field label="Household name" error={!values.householdName.trim() ? "Enter a name." : undefined}>
          {(p) => <Input {...p} maxLength={80} value={values.householdName} onChange={(e) => setValues((v) => ({ ...v, householdName: e.target.value }))} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="“Use soon” window (days)">
            {(p) => (
              <Input {...p} type="number" inputMode="numeric" min={0} max={30} value={values.expiringSoonDays} onChange={(e) => setValues((v) => ({ ...v, expiringSoonDays: Math.max(0, Math.min(30, Number(e.target.value) || 0)) }))} />
            )}
          </Field>
          <Field label="Default servings">
            {(p) => (
              <Input {...p} type="number" inputMode="numeric" min={1} max={20} value={values.defaultServings} onChange={(e) => setValues((v) => ({ ...v, defaultServings: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))} />
            )}
          </Field>
        </div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 accent-[var(--color-primary)]" checked={values.assumeStaples} onChange={(e) => setValues((v) => ({ ...v, assumeStaples: e.target.checked }))} />
          <span className="text-sm">
            <span className="font-medium">Assume I always have salt, pepper and cooking oil</span>
            <span className="block text-muted">Recipe matching won&apos;t count these as missing.</span>
          </span>
        </label>
        <Button type="submit" disabled={!dirty || !values.householdName.trim()} loading={busy}>
          Save preferences
        </Button>
      </form>
    </Card>
  );
}

function EmailSection() {
  const { data, mutate } = usePantry();
  const consent = data.settings.emailConsent;
  const [dialog, setDialog] = useState(false);
  const [agree, setAgree] = useState(false);

  const setConsent = (optedIn: boolean) =>
    mutate((repo) => repo.saveSettings({ ...data.settings, emailConsent: { optedIn, optedInAt: optedIn ? new Date().toISOString() : null } }), {
      success: optedIn ? "Email import preference turned on. No mailbox is connected." : "Email import turned off.",
    });

  return (
    <Card aria-labelledby="email-heading" id="email">
      <SectionTitle id="email-heading" badge={consent.optedIn ? <Badge tone="warning">Opted in</Badge> : <Badge>Off</Badge>}>
        Email import
      </SectionTitle>
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
        <div className="space-y-2 text-sm">
          <p>
            PantryIQ <strong>never asks for access to your mailbox</strong> unless you turn this on. Even then, no mailbox connector exists in this
            version, so nothing is connected and no email is read.
          </p>
          <p className="text-muted">
            You can always import an order email yourself: save it as an <code>.eml</code> file or copy its text into{" "}
            <Link href="/import" className="font-medium text-primary underline">
              Import Groceries
            </Link>
            .
          </p>
          {consent.optedIn && consent.optedInAt && (
            <p className="text-muted">You opted in on {new Date(consent.optedInAt).toLocaleDateString()}. Gmail and Outlook remain unavailable until a connector ships.</p>
          )}
        </div>
      </div>
      <div className="mt-4">
        {consent.optedIn ? (
          <Button variant="secondary" onClick={() => setConsent(false)}>
            Turn off email import
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              setAgree(false);
              setDialog(true);
            }}
          >
            Review email import…
          </Button>
        )}
      </div>
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Opt in to email import?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(false)}>
              Keep it off
            </Button>
            <Button
              disabled={!agree}
              onClick={async () => {
                await setConsent(true);
                setDialog(false);
              }}
            >
              Opt in
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p>Opting in records that you&apos;re willing to connect a mailbox in the future. If a connector becomes available, it would:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Ask your email provider for read-only access, only after you press Connect.</li>
            <li>Look only for order confirmations from grocery retailers.</li>
            <li>Show every item for your review before anything is added.</li>
          </ul>
          <ul className="space-y-1 rounded-xl bg-surface-2 p-3">
            {EMAIL_PROVIDERS.map((p) => (
              <li key={p.id}>
                <strong>{p.name}:</strong> not available in this version. Planned scope: <code className="break-all text-xs">{p.plannedScopes.join(", ")}</code>
              </li>
            ))}
          </ul>
          <label className="flex cursor-pointer items-start gap-2">
            <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-primary)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I understand that no mailbox will be connected now, and I can turn this off at any time.</span>
          </label>
        </div>
      </Dialog>
    </Card>
  );
}

function DataSection() {
  const { data, mutate, mode } = usePantry();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pantryiq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onRestore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      setBusy("restore");
      await mutate((repo) => restoreBackup(repo, backup), { success: (n) => `Restored ${n} records.` });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const copyFromDevice = async () => {
    setBusy("copy");
    try {
      const local = await new LocalRepository().load();
      const backup = createBackup(local);
      const total = backup.data.inventory.length + backup.data.shopping.length + backup.data.mealPlan.length + backup.data.imports.length;
      if (total === 0) toast.show("There's no data saved on this device to copy.");
      else await mutate((repo) => restoreBackup(repo, backup), { success: (n) => `Copied ${n} records from this device into the household.` });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card aria-labelledby="data-heading">
      <SectionTitle id="data-heading">Your data</SectionTitle>
      <p className="text-sm text-muted">
        {data.inventory.length} items · {data.shopping.length} on shopping list · {data.mealPlan.length} planned meals · {data.imports.length} imports
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          loading={busy === "sample"}
          onClick={async () => {
            setBusy("sample");
            await mutate(
              async (repo) => {
                await loadSampleData(repo);
                await repo.saveSettings({ ...data.settings, onboarded: true });
              },
              { success: "Sample data added." },
            );
            setBusy(null);
          }}
        >
          Load sample data
        </Button>
        <Button variant="secondary" onClick={exportBackup}>
          <Download className="size-4" aria-hidden /> Export backup
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={onRestore} aria-label="Backup file" tabIndex={-1} />
        <Button variant="secondary" loading={busy === "restore"} onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" aria-hidden /> Restore backup
        </Button>
        {mode.kind === "supabase" && (
          <Button variant="secondary" loading={busy === "copy"} onClick={copyFromDevice}>
            Copy this device&apos;s data into household
          </Button>
        )}
      </div>
      <div className="mt-6 border-t border-border pt-4">
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete all {mode.kind === "supabase" ? "household" : ""} data
        </Button>
        <p className="mt-2 text-xs text-muted">
          {mode.kind === "supabase" ? "Removes inventory, shopping list, meal plan and imports for everyone in the household." : "Removes everything saved on this device."}
        </p>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete all data?"
        message="Inventory, shopping list, meal plan and import history will be permanently deleted. Export a backup first if you might want it back."
        confirmLabel="Delete everything"
        busy={busy === "delete"}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setBusy("delete");
          await mutate((repo) => repo.clearAll(), { success: "All data deleted." });
          setBusy(null);
          setConfirmDelete(false);
        }}
      />
    </Card>
  );
}
