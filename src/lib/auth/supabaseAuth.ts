import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type AuthSessionState = {
  session: Session | null;
  user: User | null;
};

export function assertSupabaseAuth() {
  const supabase = getSupabase();
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase Auth não está configurado.");
  }
  return supabase;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = assertSupabaseAuth();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      throw new Error("E-mail ou senha inválidos.");
    }
    if (msg.includes("email not confirmed")) {
      throw new Error("Confirme seu e-mail antes de entrar.");
    }
    throw new Error(error.message || "Falha na autenticação.");
  }
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(
  callback: (state: AuthSessionState) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) {
    callback({ session: null, user: null });
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback({ session, user: session?.user ?? null });
  });

  return () => data.subscription.unsubscribe();
}
