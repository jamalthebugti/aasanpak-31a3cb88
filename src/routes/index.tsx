import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Reply, ArrowRight, Sparkles, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UsageCard } from "@/components/UsageCard";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Aassan Pak — Write English the easy way" },
      { name: "description", content: "Speak or type in Roman Urdu, Urdu, Hindi, Punjabi or English. Get clean professional English in seconds." },
    ],
  }),
});

const cards = [
  { to: "/email", title: "Write Email", desc: "Professional, polite emails with subject line", icon: Mail, color: "from-primary to-primary/70" },
  { to: "/message", title: "Write Message", desc: "Short WhatsApp & SMS in any tone", icon: MessageCircle, color: "from-accent to-accent/70" },
  { to: "/reply", title: "Reply to Message", desc: "Smart replies in your chosen style", icon: Reply, color: "from-success to-success/70" },
] as const;

function Home() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "friend";

  return (
    <div>
      <header className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary/80">
          <Sparkles className="w-3.5 h-3.5" /> Aassan Pak
        </div>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight">
          Salam, {name} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Apni zubaan mein likhein — hum English mein convert karenge.
        </p>
      </header>

      <div className="px-5 space-y-3">
        {cards.map(({ to, title, desc, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="card-soft p-5 flex items-center gap-4 group hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} text-primary-foreground flex items-center justify-center shadow-[var(--shadow-soft)]`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">{title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">{desc}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>

      <div className="px-5 mt-8">
        <Link
          to="/pricing"
          className="block rounded-3xl p-5 bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_14px_40px_-12px_oklch(0.5_0.12_195/0.5)] hover:scale-[1.01] active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-90">Go Premium</p>
              <p className="font-bold text-base">Unlimited writing from Rs.249/mo</p>
            </div>
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>
      </div>

      <div className="px-5 mt-4">
        <div className="rounded-3xl p-5 bg-gradient-to-br from-primary-soft to-accent-soft border border-border/60">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Tip</p>
          <p className="mt-1 text-sm text-foreground/80">
            Tap the <span className="font-bold">microphone</span> and speak in Urdu, Hindi or Punjabi. We'll handle the rest.
          </p>
        </div>
      </div>
    </div>
  );
}
