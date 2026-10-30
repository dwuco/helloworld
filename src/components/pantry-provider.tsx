"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LocalRepository } from "@/lib/repository/local";
import { SupabaseRepository } from "@/lib/repository/supabase";
import type { PantryRepository } from "@/lib/repository/types";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { getActiveMembership, type HouseholdMembership } from "@/lib/supabase/household";
import { DEFAULT_SETTINGS, type PantrySnapshot } from "@/lib/types";
import { useToast } from "./toast";

export type StorageMode =
  | { kind: "local" }
  | { kind: "supabase"; householdId: string; householdName: string; role: "owner" | "member"; userId: string; email: string | null };

export interface AuthState {
  configured: boolean;
  session: Session | null;
  membership: HouseholdMembership | null;
}

interface PantryContextValue {
  status: "loading" | "ready" | "error";
  error: string | null;
  data: PantrySnapshot;
  mode: StorageMode;
  auth: AuthState;
  /** Re-read data from storage. */
  reload(): Promise<void>;
  /** Re-check sign-in and household membership (after sign-in, create or join). */
  refreshAuth(): Promise<void>;
  /**
   * Run a write against the active repository, then reload. Errors are shown
   * as a toast and the promise resolves to undefined, so callers can simply
   * check the result.
   */
  mutate<T>(fn: (repo: PantryRepository) => Promise<T>, opts?: { success?: string | ((result: T) => string) }): Promise<T | undefined>;
  /** Wipe local storage when it can't be parsed. */
  resetLocalData(): Promise<void>;
}

const EMPTY: PantrySnapshot = { inventory: [], shopping: [], mealPlan: [], imports: [], settings: DEFAULT_SETTINGS };

const PantryContext = createContext<PantryContextValue | null>(null);

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Unexpected error. Please try again.";
}

export function PantryProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<PantryContextValue["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PantrySnapshot>(EMPTY);
  const [mode, setMode] = useState<StorageMode>({ kind: "local" });
  const [auth, setAuth] = useState<AuthState>({ configured: isSupabaseConfigured(), session: null, membership: null });
  const repoRef = useRef<PantryRepository | null>(null);

  const load = useCallback(async (repo: PantryRepository, initial: boolean) => {
    if (initial) setStatus("loading");
    try {
      const snapshot = await repo.load();
      if (repoRef.current !== repo) return; // a newer repository took over
      setData(snapshot);
      setError(null);
      setStatus("ready");
    } catch (e) {
      if (repoRef.current !== repo) return;
      setError(errorMessage(e));
      if (initial) setStatus("error");
      else throw e;
    }
  }, []);

  const resolveRepository = useCallback(async () => {
    const db = getSupabase();
    let repo: PantryRepository = new LocalRepository();
    let nextMode: StorageMode = { kind: "local" };
    let nextAuth: AuthState = { configured: !!db, session: null, membership: null };
    if (db) {
      try {
        const { data: sessionData } = await db.auth.getSession();
        const session = sessionData.session;
        const membership = session ? await getActiveMembership(db, session.user.id) : null;
        nextAuth = { configured: true, session, membership };
        if (session && membership) {
          repo = new SupabaseRepository(db, membership.householdId, session.user.id);
          nextMode = {
            kind: "supabase",
            householdId: membership.householdId,
            householdName: membership.householdName,
            role: membership.role,
            userId: session.user.id,
            email: session.user.email ?? null,
          };
        }
      } catch (e) {
        // Fall back to this device so the app stays usable offline / if Supabase is down.
        toast.error(`Couldn't reach your shared household (${errorMessage(e)}). Showing data saved on this device.`);
      }
    }
    repoRef.current = repo;
    setAuth(nextAuth);
    setMode(nextMode);
    await load(repo, true);
  }, [load, toast]);

  useEffect(() => {
    void resolveRepository();
    const db = getSupabase();
    if (!db) return;
    const { data: sub } = db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void resolveRepository();
    });
    return () => sub.subscription.unsubscribe();
  }, [resolveRepository]);

  // Live updates from other household members.
  useEffect(() => {
    const db = getSupabase();
    if (!db || mode.kind !== "supabase") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (repoRef.current) void load(repoRef.current, false).catch(() => undefined);
      }, 400);
    };
    const filter = `household_id=eq.${mode.householdId}`;
    const channel = db.channel(`household-${mode.householdId}`);
    for (const table of ["inventory_items", "shopping_items", "meal_plan_entries", "grocery_imports"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter }, onChange);
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      void db.removeChannel(channel);
    };
  }, [mode, load]);

  const reload = useCallback(async () => {
    if (repoRef.current) await load(repoRef.current, status !== "ready");
  }, [load, status]);

  const mutate = useCallback<PantryContextValue["mutate"]>(
    async (fn, opts) => {
      const repo = repoRef.current;
      if (!repo) {
        toast.error("Still loading. Please try again in a moment.");
        return undefined;
      }
      try {
        const result = await fn(repo);
        await load(repo, false);
        if (opts?.success) toast.success(typeof opts.success === "function" ? opts.success(result) : opts.success);
        return result;
      } catch (e) {
        toast.error(errorMessage(e));
        await load(repo, false).catch(() => undefined);
        return undefined;
      }
    },
    [load, toast],
  );

  const resetLocalData = useCallback(async () => {
    const repo = new LocalRepository();
    repo.reset();
    if (repoRef.current?.kind === "local") {
      repoRef.current = repo;
      await load(repo, true);
    }
  }, [load]);

  const value = useMemo<PantryContextValue>(
    () => ({ status, error, data, mode, auth, reload, refreshAuth: resolveRepository, mutate, resetLocalData }),
    [status, error, data, mode, auth, reload, resolveRepository, mutate, resetLocalData],
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}

export function usePantry(): PantryContextValue {
  const ctx = useContext(PantryContext);
  if (!ctx) throw new Error("usePantry must be used inside PantryProvider");
  return ctx;
}
