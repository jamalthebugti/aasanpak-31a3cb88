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

type Plan = {
  name: string;
  price: number | null;
  priceLabel?: string;
  period: string;
  highlight?: boolean;
  recommended?: boolean;
  contact?: boolean;
  perks: string[];
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: 249,
    period: "/month",
    perks: ["50 generations / month", "20 regenerations / month", "All tones & styles", "Voice input"],
  },
  {
    name: "Pro",
    price: 499,
    period: "/month",
    highlight: true,
    perks: ["200 generations / month", "Unlimited regenerations", "Priority Gemini model", "Full history search", "Email support"],
  },
  {
    name: "Premium",
    price: 999,
    period: "/month",
    recommended: true,
    perks: [
      "500 generations / month",
      "250 regenerations / month",
      "Priority Gemini model",
      "Power-user features",
      "Full history search",
      "Priority email support",
    ],
  },
  {
    name: "Business",
    price: null,
    priceLabel: "Contact for Pricing",
    period: "",
    contact: true,
    perks: [
      "Custom monthly limits",
      "Unlimited generations & regenerations",
      "Highest-quality model",
      "Custom tone presets",
      "Dedicated WhatsApp priority support",
      "Enterprise solution",
    ],
  },
];

function PricingPage() {
  const wa = (plan: string, price: number | null) => {
    const msg =
      plan === "Business"
        ? `Hello, I am interested in the Business Premium plan. Please share pricing and details.`
        : `Assalam o Alaikum! I want to subscribe to the *${plan}* plan (Rs.${price}/month) on Aassan Pak. Please share Easypaisa / Bank details.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="pb-32">
      <TopBar title="Upgrade" subtitle="Unlock unlimited English writing" icon={Crown} />

      <div className="px-5">
        <div className="card-soft p-4 mb-4 bg-gradient-to-br from-primary-soft to-accent-soft border-primary/20">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Free plan</p>
          <p className="text-sm mt-1 text-foreground/80">
            15 generations + 10 regenerates per month. Upgrade for unlimited.
          </p>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {plans.map((p) => (
          <div
            key={p.name}
            className={cn(
              "card-soft p-5 relative",
              p.highlight && "ring-2 ring-primary shadow-[0_14px_40px_-12px_oklch(0.5_0.12_195/0.45)]",
              p.recommended && "ring-2 ring-accent shadow-[0_14px_40px_-12px_oklch(0.6_0.18_300/0.45)] bg-gradient-to-br from-card to-accent-soft/40"
            )}
          >
            {p.highlight && !p.recommended && (
              <span className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider">
                Most popular
              </span>
            )}
            {p.recommended && (
              <span className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-wider shadow-lg">
                Recommended
              </span>
            )}
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-extrabold">{p.name}</h3>
              <div className="text-right">
                {p.price !== null ? (
                  <>
                    <span className="text-2xl font-extrabold">Rs.{p.price}</span>
                    <span className="text-xs text-muted-foreground">{p.period}</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-primary">{p.priceLabel}</span>
                )}
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
                p.recommended
                  ? "bg-accent text-accent-foreground hover:scale-[1.02]"
                  : p.highlight
                  ? "bg-primary text-primary-foreground hover:scale-[1.02]"
                  : "bg-secondary text-secondary-foreground hover:bg-primary-soft hover:text-primary"
              )}
            >
              <MessageCircle className="w-4 h-4" /> {p.contact ? "Contact Admin" : "Subscribe via WhatsApp"}
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
