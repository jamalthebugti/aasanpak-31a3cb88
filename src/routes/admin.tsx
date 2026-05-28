import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Users, Crown, Search, Check, X as XIcon, RotateCcw, Pause, UserPlus } from "lucide-react";
import { TopBar } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCheck,
  adminGetStats,
  adminListUsers,
  adminSetPlan,
  adminResetUsage,
  adminCreateUser,
} from "@/lib/admin.functions";
import { PLAN_LIMITS, PLAN_ORDER, type PlanName, isUnlimited } from "@/lib/plans";
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
  plan: PlanName;
  subscription_status: string;
  is_premium: boolean;
  premium_expires_at: string | null;
  signed_up_at: string;
  activated_at: string | null;
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

type FilterKey = "all" | "premium" | "free" | "suspended";

function daysLeft(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400_000);
}

function AdminPage() {
  const check = useServerFn(adminCheck);
  const getStats = useServerFn(adminGetStats);
  const listUsers = useServerFn(adminListUsers);
  const setPlan = useServerFn(adminSetPlan);
  const resetUsage = useServerFn(adminResetUsage);
  const createUser = useServerFn(adminCreateUser);

  const [ok, setOk] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [active, setActive] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);

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

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (q && !(u.email ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      const isActive =
        u.is_premium &&
        u.subscription_status === "active" &&
        (!u.premium_expires_at || new Date(u.premium_expires_at).getTime() > Date.now());
      if (filter === "premium") return isActive;
      if (filter === "free") return u.plan === "free" || !isActive;
      if (filter === "suspended") return u.subscription_status === "suspended";
      return true;
    });
  }, [users, q, filter]);

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

  return (
    <div className="pb-32">
      <TopBar title="Admin" subtitle="Manage plans, users & usage" icon={Shield} />

      <div className="px-5 grid grid-cols-2 gap-3">
        <Stat label="Total users" value={stats?.total_users ?? 0} accent="primary" />
        <Stat label="Premium" value={stats?.premium_users ?? 0} accent="accent" />
        <Stat label="Free" value={stats?.free_users ?? 0} accent="muted" />
        <Stat
          label="Month gens"
          value={(Number(stats?.month_generations) || 0) + (Number(stats?.month_regenerations) || 0)}
          accent="success"
        />
      </div>

      <div className="px-5 mt-5 space-y-3">
        <div className="card-soft p-2 flex items-center gap-2">
          <Search className="w-4 h-4 ml-2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email…"
            className="flex-1 bg-transparent outline-none py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground flex items-center gap-1 whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" /> Create user
          </button>
          <div className="flex gap-2 overflow-x-auto flex-1">
          {(["all", "premium", "free", "suspended"] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              )}
            >
              {f.toUpperCase()}
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="px-5 mt-3 space-y-2">
        {filtered.map((u) => (
          <UserCard key={u.user_id} u={u} onManage={() => setActive(u)} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>}
      </div>

      {active && (
        <ManageDrawer
          user={active}
          onClose={() => setActive(null)}
          onAction={async () => {
            await load();
          }}
          setPlan={setPlan}
          resetUsage={resetUsage}
        />
      )}

      {creating && (
        <CreateUserDrawer
          onClose={() => setCreating(false)}
          onDone={async () => {
            await load();
          }}
          createUser={createUser}
        />
      )}
    </div>
  );
}

function CreateUserDrawer({
  onClose,
  onDone,
  createUser,
}: {
  onClose: () => void;
  onDone: () => Promise<void>;
  createUser: ReturnType<typeof useServerFn<typeof adminCreateUser>>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState<PlanName>("free");
  const [days, setDays] = useState<number | "custom" | "none">("none");
  const [customDate, setCustomDate] = useState<string>(
    new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
  );
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      let durationDays: number | null = null;
      if (plan !== "free") {
        if (days === "custom") {
          const ms = new Date(customDate).getTime() - Date.now();
          durationDays = Math.max(1, Math.ceil(ms / 86400_000));
        } else if (typeof days === "number") {
          durationDays = days;
        }
      }
      await createUser({
        data: {
          email: email.trim(),
          password,
          fullName: fullName.trim() || undefined,
          plan,
          durationDays,
          makeAdmin,
        },
      });
      toast.success("User created");
      await onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <XIcon className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-extrabold pr-10">Create user</h2>
        <p className="text-xs text-muted-foreground mt-1">Account is created with email already confirmed.</p>

        <div className="mt-4 space-y-3">
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" autoComplete="off"
            className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border outline-none focus:border-primary text-sm"
          />
          <input
            required type="text" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (6+ characters)" autoComplete="new-password"
            className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border outline-none focus:border-primary text-sm"
          />
          <input
            type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name (optional)"
            className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border outline-none focus:border-primary text-sm"
          />
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Plan</p>
          <div className="grid grid-cols-3 gap-2">
            {PLAN_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={cn(
                  "p-2 rounded-xl border text-xs font-bold",
                  plan === p ? "border-primary bg-primary-soft text-primary" : "border-border bg-card",
                )}
              >
                {PLAN_LIMITS[p].label}
              </button>
            ))}
          </div>
        </div>

        {plan !== "free" && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Duration</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDays("none")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border",
                  days === "none" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border",
                )}
              >
                No expiry
              </button>
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold border",
                    days === d ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border",
                  )}
                >
                  {d} days
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDays("custom")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border",
                  days === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border",
                )}
              >
                Custom
              </button>
            </div>
            {days === "custom" && (
              <input
                type="date"
                value={customDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mt-2 w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none"
              />
            )}
          </div>
        )}

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox" checked={makeAdmin}
            onChange={(e) => setMakeAdmin(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Grant admin access
        </label>

        <button
          type="submit" disabled={busy}
          className="mt-5 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create user"}
        </button>
      </form>
    </div>
  );
}

function UserCard({ u, onManage }: { u: UserRow; onManage: () => void }) {
  const isActive =
    u.is_premium &&
    u.subscription_status === "active" &&
    (!u.premium_expires_at || new Date(u.premium_expires_at).getTime() > Date.now());
  const dleft = daysLeft(u.premium_expires_at);
  const limits = PLAN_LIMITS[u.plan];

  return (
    <button onClick={onManage} className="card-soft p-4 w-full text-left active:scale-[0.99] transition">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          )}
        >
          {isActive ? <Crown className="w-4 h-4" /> : <Users className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{u.email ?? "—"}</p>
            <PlanBadge plan={u.plan} status={u.subscription_status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Joined {new Date(u.signed_up_at).toLocaleDateString()} ·{" "}
            {Number(u.month_generations)}/
            {isUnlimited(limits.generations) ? "∞" : limits.generations} gens ·{" "}
            {Number(u.month_regenerations)}/
            {isUnlimited(limits.regenerations) ? "∞" : limits.regenerations} regens
          </p>
          {u.premium_expires_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {dleft && dleft > 0
                ? `Expires in ${dleft} day${dleft === 1 ? "" : "s"} (${new Date(u.premium_expires_at).toLocaleDateString()})`
                : `Expired ${new Date(u.premium_expires_at).toLocaleDateString()}`}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function PlanBadge({ plan, status }: { plan: PlanName; status: string }) {
  const isSuspended = status === "suspended";
  const cls = isSuspended
    ? "bg-destructive/10 text-destructive"
    : plan === "free"
    ? "bg-secondary text-foreground"
    : plan === "starter"
    ? "bg-primary-soft text-primary"
    : plan === "pro"
    ? "bg-accent-soft text-accent-foreground"
    : "bg-success/15 text-success";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", cls)}>
      {isSuspended ? "Suspended" : PLAN_LIMITS[plan].label}
    </span>
  );
}

function ManageDrawer({
  user,
  onClose,
  onAction,
  setPlan,
  resetUsage,
}: {
  user: UserRow;
  onClose: () => void;
  onAction: () => Promise<void>;
  setPlan: ReturnType<typeof useServerFn<typeof adminSetPlan>>;
  resetUsage: ReturnType<typeof useServerFn<typeof adminResetUsage>>;
}) {
  const [plan, setPlanLocal] = useState<PlanName>(user.plan === "free" ? "starter" : user.plan);
  const [days, setDays] = useState<number | "custom">(30);
  const [customDate, setCustomDate] = useState<string>(
    new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)
  );
  const [busy, setBusy] = useState(false);

  const computeExpiry = () => {
    if (days === "custom") {
      const d = new Date(customDate);
      d.setHours(23, 59, 59, 0);
      return d.toISOString();
    }
    return new Date(Date.now() + Number(days) * 86400_000).toISOString();
  };

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      await onAction();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <XIcon className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-extrabold pr-10 truncate">{user.email ?? "User"}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <PlanBadge plan={user.plan} status={user.subscription_status} />
          {user.premium_expires_at && (
            <span className="text-xs text-muted-foreground">
              Expires {new Date(user.premium_expires_at).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Select plan</p>
          <div className="grid grid-cols-2 gap-2">
            {PLAN_ORDER.filter((p) => p !== "free").map((p) => {
              const limits = PLAN_LIMITS[p];
              return (
                <button
                  key={p}
                  onClick={() => setPlanLocal(p)}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition",
                    plan === p
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <p className="font-bold text-sm">{limits.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isUnlimited(limits.generations) ? "∞" : limits.generations} gens ·{" "}
                    {isUnlimited(limits.regenerations) ? "∞" : limits.regenerations} regens
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Duration</p>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border",
                  days === d ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                )}
              >
                {d} days
              </button>
            ))}
            <button
              onClick={() => setDays("custom")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold border",
                days === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
              )}
            >
              Custom
            </button>
          </div>
          {days === "custom" && (
            <input
              type="date"
              value={customDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setCustomDate(e.target.value)}
              className="mt-2 w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none"
            />
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={() =>
              act(
                () => setPlan({ data: { userId: user.user_id, plan, expiresAt: computeExpiry(), status: "active" } }),
                user.is_premium ? "Plan updated" : "Plan activated"
              )
            }
            className="py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> {user.is_premium ? "Update plan" : "Activate"}
          </button>
          <button
            disabled={busy || !user.is_premium}
            onClick={() =>
              act(
                () =>
                  setPlan({
                    data: {
                      userId: user.user_id,
                      plan: user.plan,
                      expiresAt: new Date(
                        Math.max(
                          Date.now(),
                          user.premium_expires_at ? new Date(user.premium_expires_at).getTime() : Date.now()
                        ) + (typeof days === "number" ? days : 30) * 86400_000
                      ).toISOString(),
                      status: "active",
                    },
                  }),
                "Subscription extended"
              )
            }
            className="py-3 rounded-xl bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> Extend
          </button>
          <button
            disabled={busy}
            onClick={() =>
              act(() => resetUsage({ data: { userId: user.user_id } }), "Usage reset for this month")
            }
            className="py-3 rounded-xl bg-secondary text-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset usage
          </button>
          <button
            disabled={busy || !user.is_premium}
            onClick={() =>
              act(
                () =>
                  setPlan({
                    data: {
                      userId: user.user_id,
                      plan: user.plan,
                      expiresAt: user.premium_expires_at,
                      status: "suspended",
                    },
                  }),
                "Subscription suspended"
              )
            }
            className="py-3 rounded-xl bg-accent-soft text-accent-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Pause className="w-3.5 h-3.5" /> Suspend
          </button>
          <button
            disabled={busy || !user.is_premium}
            onClick={() =>
              act(
                () =>
                  setPlan({
                    data: { userId: user.user_id, plan: "free", expiresAt: null, status: "inactive" },
                  }),
                "Premium removed"
              )
            }
            className="col-span-2 py-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <XIcon className="w-3.5 h-3.5" /> Remove premium
          </button>
        </div>
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
