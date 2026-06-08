import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export type UserRole = "admin" | "common";

export interface Profile {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  active: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hour

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id,name,username,email,role,active")
      .eq("id", userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }

  useEffect(() => {
    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlocks
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Inactivity logout
  useEffect(() => {
    if (!session) return;
    const reset = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(async () => {
        await signOut();
      }, INACTIVITY_MS);
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [session]);

  async function signOut() {
    try {
      await logAudit("Autenticação", "logout");
    } catch {}
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function reloadProfile() {
    if (session?.user) await loadProfile(session.user.id);
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    signOut,
    reloadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
