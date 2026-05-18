import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Users, Crown, Search, Check, X as XIcon } from "lucide-react";
import { TopBar } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { adminCheck, adminGetStats, adminListUsers, adminSetPremium } from "@/lib/admin.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — Aassan Pak" }] }),
});

type UserRow = {
  user_id: string;
  email: string | null;
  is_premium: boolean;
  premium_expires_at: string | null;
  signed_up_at: string;
  month_generations: number;
  month_regenerations: number;
};

type Stats = {
  total_users: number;
  premium_users: number;
  free_users: number;
  month_generations: number;
  month_regenerations: number;
};

function AdminPage() {
  const check = useServerFn(adminCheck);
  const getStats = useServerFn(adminGetStats);
  const listUsers = useServerFn(adminListUsers);
  const setPremium = useServerFn(adminSetPremium);

  const [ok, setOk] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const [s, u] = await Promise.all([getStats(), listUsers()]);
      setStats(s as Stats);
      setUsers((u as UserRow[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load admin data");
    }
  };

  useEffect(() => {
    check()
      .then((r) => {
        setOk(r.isAdmin);
        if (r.isAdmin) load();
      })
      .catch(() => setOk(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ok === null) return <div className="p-8 text-center text-muted-foreground">Checking access…</div>;
  if (!ok)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <Shield className="w-12 h-12 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">This area is for administrators only.</p>
        <Link to="/" className="mt-6 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold">
          Go home
        </Link>
      </div>
    );

  const filtered = users.filter((u) => !q || (u.email ?? "").toLowerCase().includes(q.toLowerCase()));

  const togglePremium = async (u: UserRow, days?: number) => {
    setBusy(u.user_id);
    try {
      const isPremium = !u.is_premium || !!days;
      const expiresAt = days
        ? new Date(Date.now() + days * 86400_000).toISOString()
        : isPremium
        ? null
        : null;
      await setPremium({ data: { userId: u.user_id, isPremium, expiresAt } });
      toast.success(isPremium ? "Premium activated" : "Premium removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pb-32">
      <TopBar title="Admin" subtitle="Manage users & premium" icon={Shield} />

      <div className="px-5 grid grid-cols-2 gap-3">
        <Stat label="Total users" value={stats?.total_users ?? 0} accent="primary" />
        <Stat label="Premium" value={stats?.premium_users ?? 0} accent="accent" />
        <Stat label="Free" value={stats?.free_users ?? 0} accent="muted" />
        <Stat label="Month gens" value={(stats?.month_generations ?? 0) + (stats?.month_regenerations ?? 0)} accent="success" />
      </div>

      <div className="px-5 mt-5">
        <div className="card-soft p-2 flex items-center gap-2">
          <Search className="w-4 h-4 ml-2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email…"
            className="flex-1 bg-transparent outline-none py-2 text-sm"
          />
        </div>
      </div>

      <div className="px-5 mt-3 space-y-2">
        {filtered.map((u) => {
          const active =
            u.is_premium && (!u.premium_expires_at || new Date(u.premium_expires_at).getTime() > Date.now());
          return (
            <div key={u.user_id} className="card-soft p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {active ? <Crown className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.email ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(u.signed_up_at).toLocaleDateString()} ·{" "}
                    {Number(u.month_generations)} gens / {Number(u.month_regenerations)} regens this month
                  </p>
                  {u.premium_expires_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Expires {new Date(u.premium_expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  disabled={busy === u.user_id}
                  onClick={() => togglePremium(u, 30)}
                  className="py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> +30 days
                </button>
                <button
                  disabled={busy === u.user_id}
                  onClick={() => togglePremium(u, 90)}
                  className="py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> +90 days
                </button>
                <button
                  disabled={busy === u.user_id || !u.is_premium}
                  onClick={() => togglePremium({ ...u, is_premium: true }, 0).then(() => setPremium({ data: { userId: u.user_id, isPremium: false, expiresAt: null } }).then(load))}
                  className="py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <XIcon className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: "primary" | "accent" | "muted" | "success" }) {
  const bg = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent-foreground",
    muted: "bg-secondary text-foreground",
    success: "bg-success/15 text-success",
  }[accent];
  return (
    <div className={cn("card-soft p-4", bg)}>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs font-semibold opacity-80">{label}</p>
    </div>
  );
}
