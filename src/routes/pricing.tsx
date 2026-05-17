import { createFileRoute } from "@tanstack/react-router";
import { Crown, Check, MessageCircle } from "lucide-react";
import { TopBar } from "@/components/BottomNav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Aassan Pak" },
      { name: "description", content: "Affordable plans for unlimited English writing help. Pay via Easypaisa or Bank Transfer." },
    ],
  }),
});

const WHATSAPP_NUMBER = "923210006990";

const plans = [
  {
    name: "Starter",
    price: 249,
    period: "/month",
    highlight: false,
    perks: ["50 generations / day", "20 regenerates / day", "All tones & styles", "Voice input"],
  },
  {
    name: "Pro",
    price: 499,
    period: "/month",
    highlight: true,
    perks: ["200 generations / day", "Unlimited regenerates", "Priority Gemini model", "Full history search", "Email support"],
  },
  {
    name: "Business",
    price: 999,
    period: "/month",
    highlight: false,
    perks: ["Unlimited generations", "Unlimited regenerates", "Highest-quality model", "Custom tone presets", "WhatsApp priority support"],
  },
];

function PricingPage() {
  const wa = (plan: string, price: number) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Assalam o Alaikum! I want to subscribe to the *${plan}* plan (Rs.${price}/month) on Aassan Pak. Please share Easypaisa / Bank details.`
    )}`;

  return (
    <div className="pb-32">
      <TopBar title="Upgrade" subtitle="Unlock unlimited English writing" icon={Crown} />

      <div className="px-5">
        <div className="card-soft p-4 mb-4 bg-gradient-to-br from-primary-soft to-accent-soft border-primary/20">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Free plan</p>
          <p className="text-sm mt-1 text-foreground/80">
            15 generations + 10 regenerates per day. Upgrade for more.
          </p>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {plans.map((p) => (
          <div
            key={p.name}
            className={cn(
              "card-soft p-5 relative",
              p.highlight && "ring-2 ring-primary shadow-[0_14px_40px_-12px_oklch(0.5_0.12_195/0.45)]"
            )}
          >
            {p.highlight && (
              <span className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider">
                Most popular
              </span>
            )}
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-extrabold">{p.name}</h3>
              <div className="text-right">
                <span className="text-2xl font-extrabold">Rs.{p.price}</span>
                <span className="text-xs text-muted-foreground">{p.period}</span>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {p.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <a
              href={wa(p.name, p.price)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-5 w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                p.highlight
                  ? "bg-primary text-primary-foreground hover:scale-[1.02]"
                  : "bg-secondary text-secondary-foreground hover:bg-primary-soft hover:text-primary"
              )}
            >
              <MessageCircle className="w-4 h-4" /> Subscribe via WhatsApp
            </a>
          </div>
        ))}
      </div>

      <div className="px-5 mt-6">
        <div className="card-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment methods</p>
          <p className="text-sm mt-2 text-foreground/80">
            <span className="font-semibold">Easypaisa</span> · <span className="font-semibold">JazzCash</span> · <span className="font-semibold">Bank Transfer</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Send a message on WhatsApp to receive payment details. Your plan is activated within a few minutes after confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
