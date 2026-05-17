import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  kind: z.enum(["email", "message", "reply"]),
  input: z.string().trim().min(1).max(4000),
  tone: z.string().trim().max(40).optional().default("Professional").transform((v) => v || "Professional"),
  style: z.string().trim().max(40).optional().default("Professional").transform((v) => v || "Professional"),
  regenerate: z.boolean().optional().default(false),
});

const DAILY_INPUT_LIMIT = 15;
const DAILY_REGEN_LIMIT = 10;

function buildPrompt(kind: string, input: string, tone?: string, style?: string) {
  const common = `You are a writing assistant for people who are not fluent in English. The user may write in Roman Urdu, Urdu, Hindi, Punjabi, or English. Auto-detect the language. Convert the meaning faithfully into clear, simple, natural English. Use easy vocabulary. Keep grammar correct and polite. Never explain — only return the requested output.`;

  if (kind === "email") {
    return `${common}

Task: Write a professional but simple English email.
Return STRICT format:
Subject: <one short subject line>
---
<email body with greeting, short body, polite closing>

User message:
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
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Too many requests to Gemini. Try again in a moment.");
    if (res.status === 401 || res.status === 403) throw new Error("Gemini API key is invalid or unauthorized.");
    throw new Error(`Gemini error (${res.status}): ${errText.slice(0, 200) || "unknown"}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Blocked: ${data.promptFeedback.blockReason}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Empty response from Gemini.");
  return text;
}

export const generateCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured. Missing GEMINI_API_KEY.");

    // Daily limit check (free tier: 15 inputs, 10 regenerates per day)
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { data: todayRows, error: countErr } = await context.supabase
      .from("history")
      .select("id,meta")
      .eq("user_id", context.userId)
      .gte("created_at", since.toISOString());

    if (!countErr && todayRows) {
      const total = todayRows.length;
      const regens = todayRows.filter((r) => (r.meta as { regenerate?: boolean } | null)?.regenerate === true).length;
      const newInputs = total - regens;

      if (data.regenerate && regens >= DAILY_REGEN_LIMIT) {
        throw new Error(`Daily regenerate limit reached (${DAILY_REGEN_LIMIT}/day). Upgrade to continue.`);
      }
      if (!data.regenerate && newInputs >= DAILY_INPUT_LIMIT) {
        throw new Error(`Daily free limit reached (${DAILY_INPUT_LIMIT} generations/day). Upgrade to continue.`);
      }
    }

    const prompt = buildPrompt(data.kind, data.input, data.tone, data.style);
    const output = await callGemini(apiKey, prompt);

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
