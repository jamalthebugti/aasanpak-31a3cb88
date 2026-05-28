import { useEffect, useState } from "react";
import { Crown, Sparkles, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getUsage } from "@/lib/generate.functions";
import { isUnlimited } from "@/lib/plans";
import { cn } from "@/lib/utils";

type Usage = Awaited<ReturnType<typeof getUsage>>;

export function UsageCard() {
  const fetchUsage = getUsage;
  const [u, setU] = useState<Usage | null>(null);

  useEffect(() => {
    fetchUsage().then(setU).catch(() => {});
  }, [fetchUsage]);

  if (!u) return null;

  const genUnlimited = isUnlimited(u.generationLimit);
  const regenUnlimited = isUnlimited(u.regenerationLimit);

  if (u.premium && genUnlimited && regenUnlimited) {
    return (
      <div className="card-soft p-4 bg-gradient-to-br from-primary to-accent text-primary-foreground border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <Crown className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest opacity-90">{u.planLabel} active</p>
            <p className="font-bold text-sm">Unlimited generations & regenerations</p>
          </div>
        </div>
      </div>
    );
  }

  const genLeft = genUnlimited ? Infinity : Math.max(0, u.generationLimit - u.generations);
  const regenLeft = regenUnlimited ? Infinity : Math.max(0, u.regenerationLimit - u.regenerations);
  const showWarn = !u.premium && (genLeft <= 3 || regenLeft <= 2);

  return (
    <div className="card-soft p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {u.planLabel} · monthly usage
        </p>
        {!u.premium && (
          <Link to="/pricing" className="text-xs font-semibold text-primary hover:underline">
            Upgrade
          </Link>
        )}
      </div>

      <Bar icon={Sparkles} label="Generations" used={u.generations} total={u.generationLimit} />
      <Bar icon={RefreshCw} label="Regenerations" used={u.regenerations} total={u.regenerationLimit} />

      {showWarn && (
        <p className="text-xs font-medium text-primary bg-primary-soft rounded-lg p-2">
          {genLeft === 0
            ? "Your monthly free limit has ended. Upgrade to continue."
            : `You have ${genLeft} free generation${genLeft === 1 ? "" : "s"} remaining this month.`}
        </p>
      )}
    </div>
  );
}

function Bar({ icon: Icon, label, used, total }: { icon: any; label: string; used: number; total: number }) {
  const unlimited = isUnlimited(total);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(total, 1)) * 100));
  const danger = pct >= 80;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="flex items-center gap-2 font-semibold">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" /> {label}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {used}/{unlimited ? "∞" : total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", unlimited ? "bg-success" : danger ? "bg-destructive" : "bg-primary")}
          style={{ width: unlimited ? "100%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}
