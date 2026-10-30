import type { Session, SupabaseClient } from "@supabase/supabase-js";

export interface HouseholdMembership {
  householdId: string;
  householdName: string;
  role: "owner" | "member";
}

export interface HouseholdMember {
  userId: string;
  email: string | null;
  role: "owner" | "member";
  joinedAt: string;
}

/**
 * Sign-in uses a one-time email link from Supabase Auth. This only verifies the
 * user's address; it never grants PantryIQ any access to their mailbox.
 */
export async function sendMagicLink(db: SupabaseClient, email: string, redirectTo: string): Promise<void> {
  const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) throw new Error(error.message);
}

export async function getSession(db: SupabaseClient): Promise<Session | null> {
  const { data, error } = await db.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signOut(db: SupabaseClient): Promise<void> {
  const { error } = await db.auth.signOut();
  if (error) throw new Error(error.message);
}

/** The user's active household, falling back to the first one they belong to. */
export async function getActiveMembership(db: SupabaseClient, userId: string): Promise<HouseholdMembership | null> {
  const [profile, memberships] = await Promise.all([
    db.from("profiles").select("active_household_id").eq("user_id", userId).maybeSingle(),
    db.from("household_members").select("household_id, role, households(name)").eq("user_id", userId),
  ]);
  if (memberships.error) throw new Error(memberships.error.message);
  const rows = (memberships.data ?? []) as unknown as {
    household_id: string;
    role: "owner" | "member";
    households: { name: string } | { name: string }[] | null;
  }[];
  if (rows.length === 0) return null;
  const activeId = (profile.data as { active_household_id: string | null } | null)?.active_household_id;
  const row = rows.find((r) => r.household_id === activeId) ?? rows[0]!;
  const hh = Array.isArray(row.households) ? row.households[0] : row.households;
  return { householdId: row.household_id, householdName: hh?.name ?? "Household", role: row.role };
}

export async function createHousehold(db: SupabaseClient, name: string): Promise<string> {
  const { data, error } = await db.rpc("create_household", { p_name: name });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function joinHousehold(db: SupabaseClient, code: string): Promise<string> {
  const { data, error } = await db.rpc("join_household", { p_code: code.trim() });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function createInvite(db: SupabaseClient, householdId: string): Promise<string> {
  const { data, error } = await db.rpc("create_household_invite", { p_household: householdId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function listMembers(db: SupabaseClient, householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await db
    .from("household_members")
    .select("user_id, email, role, joined_at")
    .eq("household_id", householdId)
    .order("joined_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    email: r.email as string | null,
    role: r.role as "owner" | "member",
    joinedAt: r.joined_at as string,
  }));
}

export async function leaveHousehold(db: SupabaseClient, householdId: string, userId: string): Promise<void> {
  const { error } = await db.from("household_members").delete().eq("household_id", householdId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
