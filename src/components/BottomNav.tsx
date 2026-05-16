import { Link, useLocation } from "@tanstack/react-router";
import { Home, Clock, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/history", label: "History", icon: Clock },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-md px-4 pb-4">
        <div className="pointer-events-auto rounded-3xl bg-card/90 backdrop-blur border border-border shadow-[0_10px_30px_-12px_oklch(0.3_0.05_200/0.25)] flex items-center justify-around p-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all",
                  active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "scale-110")} />
                <span className="text-[11px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function TopBar({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <header className="px-5 pt-8 pb-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-soft)]">
        {Icon ? <Icon className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </div>
      <div>
        <h1 className="text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
}
