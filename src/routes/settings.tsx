import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Settings as SettingsIcon, Moon, Sun, LogOut, User as UserIcon, Heart, Crown, Shield } from "lucide-react";
import { TopBar } from "@/components/BottomNav";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { adminCheck } from "@/lib/admin.functions";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Aassan Pak" }] }),
});

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const check = useServerFn(adminCheck);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    check().then((r) => setIsAdmin(!!r.isAdmin)).catch(() => {});
  }, [user, check]);

  return (
    <div>
      <TopBar title="Settings" subtitle="Make it yours" icon={SettingsIcon} />
      <div className="px-5 space-y-3">
        <div className="card-soft p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Signed in</p>
          </div>
        </div>

        <button onClick={toggle} className="card-soft p-4 w-full flex items-center gap-3 text-left hover:scale-[1.01] transition-transform">
          <div className="w-11 h-11 rounded-2xl bg-accent-soft text-accent-foreground flex items-center justify-center">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className="font-semibold">Dark Mode</p>
            <p className="text-xs text-muted-foreground">{theme === "dark" ? "On" : "Off"}</p>
          </div>
          <div className={`w-12 h-7 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-border"} relative`}>
            <span className={`absolute top-0.5 ${theme === "dark" ? "left-6" : "left-0.5"} w-6 h-6 rounded-full bg-card shadow transition-all`} />
          </div>
        </button>

        <button
          onClick={() => supabase.auth.signOut()}
          className="card-soft p-4 w-full flex items-center gap-3 text-left hover:bg-destructive/5 transition"
        >
          <div className="w-11 h-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-destructive">Sign out</p>
            <p className="text-xs text-muted-foreground">You can sign back in any time</p>
          </div>
        </button>

        <div className="px-2 pt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          Made with <Heart className="w-3 h-3 fill-accent text-accent" /> for Pakistan
        </div>
      </div>
    </div>
  );
}
