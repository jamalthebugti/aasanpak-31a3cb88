import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  kind: z.enum(["email", "message", "reply"]),
  input: z.string().min(1).max(4000),
  tone: z.string().min(1).max(40).optional(),
  style: z.string().min(1).max(40).optional(),
});

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
  // reply
  return `${common}

Task: Read the message below and write a smart English reply.
Reply style: ${style || "Professional"}.
Return ONLY the reply text — no preface, no quotes.

Message to reply to:
"""${input}"""`;
}

export const generateCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = buildPrompt(data.kind, data.input, data.tone, data.style);

    let result;
    try {
      result = await generateText({ model, prompt });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("Too many requests. Please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Please add credits in Workspace settings.");
      throw new Error("Could not generate. Please try again.");
    }

    const output = result.text.trim();

    // save to history (best effort)
    try {
      await context.supabase.from("history").insert({
        user_id: context.userId,
        kind: data.kind,
        input: data.input,
        output,
        meta: { tone: data.tone, style: data.style },
      });
    } catch (e) {
      console.error("history insert failed", e);
    }

    return { output };
  });
