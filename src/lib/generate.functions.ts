import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLAN_LIMITS, type PlanName, isUnlimited } from "@/lib/plans";

const InputSchema = z.object({
  kind: z.enum(["email", "message", "reply"]),
  input: z.string().trim().min(1).max(4000),
  tone: z.string().trim().max(40).optional().default("Professional").transform((v) => v || "Professional"),
  style: z.string().trim().max(40).optional().default("Professional").transform((v) => v || "Professional"),
  length: z.enum(["Standard", "Detailed Professional", "Highly Professional", "Short Version"]).optional().default("Detailed Professional"),
  regenerate: z.boolean().optional().default(false),
});

// Kept for back-compat with any importers
export const MONTHLY_INPUT_LIMIT = PLAN_LIMITS.free.generations;
export const MONTHLY_REGEN_LIMIT = PLAN_LIMITS.free.regenerations;

function buildPrompt(kind: string, input: string, tone?: string, style?: string, length?: string) {
  const common = `You are a senior professional writing assistant for people who are not fluent in English. The user may write in Roman Urdu, Urdu, Hindi, Punjabi, or English — often very short, rough, or informal. Auto-detect the language. Preserve the original meaning faithfully. Use clear, simple, natural English (easy vocabulary, correct grammar, polite tone). Never explain your work — only return the requested output.`;

  if (kind === "email") {
    const mode = length || "Detailed Professional";
    const lengthGuide =
      mode === "Short Version"
        ? "Keep the email concise: 60–100 words. Still include greeting, 1 short paragraph, and a polite closing."
        : mode === "Standard"
        ? "Write a balanced email: 100–160 words. Greeting, 1–2 clear paragraphs, polite closing."
        : mode === "Highly Professional"
        ? "Write a polished, formal corporate email: 200–300 words. Greeting, clear introduction, detailed body across 2–3 paragraphs, formal closing. Use refined, executive-level English while staying easy to read."
        : "Write a complete, detailed, professional email: 150–250 words. Greeting, clear introduction, 2–3 well-developed body paragraphs, polite closing.";

    return `${common}

Task: Transform the user's short or rough instruction into a complete, authentic, workplace-ready English email.

Core rules:
- Deeply understand the user's intent even if the input is just a few words.
- Intelligently expand and add realistic professional context WITHOUT changing the original meaning or inventing false facts (names, dates, numbers). Use neutral placeholders like [Name], [Date], [Team] only if essential.
- Auto-detect the situation type (leave request, complaint, warning, apology, meeting request, client message, HR communication, follow-up, etc.) and adapt tone accordingly.
- Tone preference from user: ${tone || "Professional"}.
- ${lengthGuide}
- Sound human, natural, and business-appropriate. Avoid robotic, repetitive, or overly generic phrases.
- Use proper paragraph spacing (blank line between paragraphs).
- End with a professional closing (Best regards / Sincerely / Thank you) followed by a signature placeholder like "[Your Name]".

Return STRICT format (and nothing else):
Subject: <one clear, specific subject line>
---
<full email body with greeting, paragraphs separated by blank lines, closing, and signature placeholder>

User instruction:
"""${input}"""`;
  }
  if (kind === "message") {
    return `${common}

Task: Write a SHORT WhatsApp/SMS message in English.
Tone: ${tone || "Friendly"}.
Keep it 1–3 sentences. No subject. No signature. Just the message.

User message:
"""${input}"""`;
  }
  return `${common}

Task: Read the message below and write a smart English reply.
Reply style: ${style || "Professional"}.
Return ONLY the reply text — no preface, no quotes.

Message to reply to:
"""${input}"""`;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.75, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Too many requests. Try again in a moment.");
    if (res.status === 401 || res.status === 403) throw new Error("AI service key is invalid.");
    throw new Error(`AI error (${res.status}): ${errText.slice(0, 200) || "unknown"}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Blocked: ${data.promptFeedback.blockReason}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Empty response from AI.");
  return text;
}

interface EffectivePlan {
  plan: PlanName;
  isActive: boolean; // premium + not expired
  expiresAt: string | null;
}

async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("plan, is_premium, premium_expires_at, subscription_status")
    .eq("user_id", userId)
    .maybeSingle();

  const planRaw = (data?.plan as PlanName | undefined) ?? "free";
  const expiresAt = (data?.premium_expires_at as string | null) ?? null;
  const notExpired = !expiresAt || new Date(expiresAt).getTime() > Date.now();
  const isActive =
    planRaw !== "free" &&
    !!data?.is_premium &&
    data?.subscription_status === "active" &&
    notExpired;

  return { plan: isActive ? planRaw : "free", isActive, expiresAt };
}

async function getCurrentCounters(userId: string) {
  // Period start = first day of current month (UTC-ish, matches db function)
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const periodStart = start.toISOString().slice(0, 10);

  const { data } = await supabaseAdmin
    .from("usage_counters")
    .select("generations, regenerations")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle();

  return {
    generations: data?.generations ?? 0,
    regenerations: data?.regenerations ?? 0,
  };
}

export const generateCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const { plan } = await getEffectivePlan(context.userId);
    const limits = PLAN_LIMITS[plan];

    // Enforce limits server-side from persistent usage_counters
    const counters = await getCurrentCounters(context.userId);

    if (data.regenerate) {
      if (!isUnlimited(limits.regenerations) && counters.regenerations >= limits.regenerations) {
        throw new Error(
          `LIMIT_REACHED: Monthly regenerate limit reached (${limits.regenerations}/month on ${PLAN_LIMITS[plan].label}). Upgrade for more.`
        );
      }
    } else {
      if (!isUnlimited(limits.generations) && counters.generations >= limits.generations) {
        throw new Error(
          `LIMIT_REACHED: Monthly generation limit reached (${limits.generations}/month on ${PLAN_LIMITS[plan].label}). Upgrade for more.`
        );
      }
    }

    const prompt = buildPrompt(data.kind, data.input, data.tone, data.style, data.length);
    const output = await callGemini(apiKey, prompt);

    // Increment persistent counter (cannot be reduced by deleting history)
    try {
      await supabaseAdmin.rpc("increment_usage", {
        _user_id: context.userId,
        _is_regen: !!data.regenerate,
      });
    } catch (e) {
      console.error("increment_usage failed", e);
    }

    // History is purely for display; deleting it does NOT affect limits.
    try {
      await context.supabase.from("history").insert({
        user_id: context.userId,
        kind: data.kind,
        input: data.input,
        output,
        meta: { tone: data.tone, style: data.style, regenerate: !!data.regenerate },
      });
    } catch (e) {
      console.error("history insert failed", e);
    }

    return { output };
  });

export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const eff = await getEffectivePlan(context.userId);
    const limits = PLAN_LIMITS[eff.plan];
    const counters = await getCurrentCounters(context.userId);

    return {
      plan: eff.plan,
      planLabel: limits.label,
      premium: eff.isActive,
      generations: counters.generations,
      regenerations: counters.regenerations,
      generationLimit: limits.generations,
      regenerationLimit: limits.regenerations,
      premiumExpiresAt: eff.expiresAt,
    };
  });
