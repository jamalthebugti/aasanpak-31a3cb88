import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, Copy, Share2, RefreshCw, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { generateCopy } from "@/lib/generate.functions";
import { useVoiceInput } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/UpgradeModal";

type Kind = "email" | "message" | "reply";

interface Props {
  kind: Kind;
  placeholder: string;
  tones?: string[];
  toneLabel?: string;
  toneKey?: "tone" | "style";
  cta?: string;
  lengths?: string[];
}

export function Generator({ kind, placeholder, tones, toneLabel = "Tone", toneKey = "tone", cta = "Generate", lengths }: Props) {
  const [input, setInput] = useState("");
  const [tone, setTone] = useState(tones?.[0] ?? "Professional");
  const [length, setLength] = useState(lengths?.[1] ?? lengths?.[0] ?? "Detailed Professional");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();
  const generate = useServerFn(generateCopy);
  const { listening, supported, start, stop } = useVoiceInput((text) =>
    setInput((p) => (p ? p + " " : "") + text)
  );

  const run = async (isRegen = false) => {
    if (!input.trim()) {
      toast.error("Please write or speak something first");
      return;
    }
    setLoading(true);
    if (!isRegen) setOutput("");
    try {
      const payload: Record<string, unknown> = {
        kind,
        input: input.trim(),
        regenerate: isRegen,
      };
      payload[toneKey] = tone || "Professional";
      if (lengths) payload.length = length;
      const res = await generate({ data: payload as any });
      setOutput(res.output);
      if (isRegen) toast.success("Regenerated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/LIMIT_REACHED/i.test(msg)) {
        setUpgradeMsg(msg.replace(/^.*LIMIT_REACHED:\s*/i, ""));
        setUpgradeOpen(true);
      } else if (/limit/i.test(msg)) {
        toast.error(msg);
      } else if (/network|fetch/i.test(msg)) {
        toast.error("Server temporarily unavailable. Please try again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    const text = output;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="px-5 space-y-4">
      <div className="card-soft p-4">
        <label className="text-sm font-semibold text-muted-foreground">Write or speak in any language</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="mt-2 w-full bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground/60"
        />
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            onClick={listening ? stop : start}
            disabled={!supported}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all",
              listening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary-soft text-primary hover:scale-105",
              !supported && "opacity-50 cursor-not-allowed"
            )}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {listening ? "Stop" : supported ? "Speak" : "Voice N/A"}
          </button>
          <span className="text-xs text-muted-foreground">{input.length}/4000</span>
        </div>
      </div>

      {tones && (
        <div>
          <p className="text-sm font-semibold mb-2 px-1">{toneLabel}</p>
          <div className="flex flex-wrap gap-2">
            {tones.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                  tone === t
                    ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-soft)]"
                    : "bg-card text-foreground border-border hover:border-primary/40"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {lengths && (
        <div>
          <p className="text-sm font-semibold mb-2 px-1">Length</p>
          <div className="flex flex-wrap gap-2">
            {lengths.map((l) => (
              <button
                key={l}
                onClick={() => setLength(l)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                  length === l
                    ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-soft)]"
                    : "bg-card text-foreground border-border hover:border-primary/40"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => run()}
        disabled={loading || !input.trim()}
        className={cn(
          "w-full py-4 rounded-3xl font-bold text-base text-primary-foreground bg-primary transition-all flex items-center justify-center gap-2",
          "shadow-[0_10px_30px_-10px_oklch(0.5_0.12_195/0.6)]",
          (loading || !input.trim()) ? "opacity-60" : "hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        {loading ? (
          <>
            <Sparkles className="w-5 h-5 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" /> {cta}
          </>
        )}
      </button>

      {output && (
        <div className="card-soft p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Result</p>
          <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{output}</pre>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            <button onClick={copy} className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-primary-soft hover:text-primary transition">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy
            </button>
            <button onClick={share} className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-success/15 text-success font-semibold text-sm hover:bg-success/25 transition">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button onClick={() => run(true)} disabled={loading} className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-accent-soft text-accent-foreground font-semibold text-sm hover:scale-[1.02] transition disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Redo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
