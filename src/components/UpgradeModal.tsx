import { Link } from "@tanstack/react-router";
import { Crown, X, Sparkles, Zap, Mic, Infinity as InfinityIcon } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export function UpgradeModal({ open, onClose, message }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-[var(--shadow-soft)]">
          <Crown className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold">Upgrade to Premium</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {message || "You have reached your free monthly limit. Upgrade to Premium for unlimited AI writing, replies, and voice features."}
        </p>

        <ul className="mt-5 space-y-2.5">
          {[
            { icon: InfinityIcon, t: "Unlimited generations" },
            { icon: Sparkles, t: "Unlimited regenerations" },
            { icon: Mic, t: "Voice input + priority AI" },
            { icon: Zap, t: "Faster response speed" },
          ].map(({ icon: I, t }) => (
            <li key={t} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                <I className="w-4 h-4" />
              </div>
              <span className="font-medium">{t}</span>
            </li>
          ))}
        </ul>

        <Link
          to="/pricing"
          onClick={onClose}
          className="mt-6 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition"
        >
          <Crown className="w-4 h-4" /> See premium plans
        </Link>
        <button onClick={onClose} className="mt-2 w-full py-2.5 text-sm text-muted-foreground font-semibold">
          Maybe later
        </button>
      </div>
    </div>
  );
}
