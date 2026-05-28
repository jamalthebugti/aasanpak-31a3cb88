// Plain client-side admin helpers. All RPCs are SECURITY DEFINER and check
// has_role(auth.uid(), 'admin') server-side, so calling them from the browser
// with the anon key is safe — only real admins can mutate data.
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export async function adminCheck() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { isAdmin: false };
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return { isAdmin: !!data };
}

export async function adminGetStats() {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw new Error(error.message);
  return (data?.[0] ?? null) as any;
}

export async function adminListUsers() {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

const PlanEnum = z.enum(["free", "starter", "pro", "premium", "business"]);
const StatusEnum = z.enum(["active", "suspended", "inactive"]);

const SetPlanSchema = z.object({
  userId: z.string().uuid(),
  plan: PlanEnum,
  expiresAt: z.string().datetime().nullable().optional(),
  status: StatusEnum.optional().default("active"),
  notes: z.string().max(500).optional().nullable(),
});

export async function adminSetPlan({ data }: { data: z.input<typeof SetPlanSchema> }) {
  const parsed = SetPlanSchema.parse(data);
  const { error } = await supabase.rpc("admin_set_plan", {
    _user_id: parsed.userId,
    _plan: parsed.plan,
    _expires_at: (parsed.expiresAt ?? null) as any,
    _status: parsed.status,
    _notes: parsed.notes ?? undefined,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function adminResetUsage({ data }: { data: { userId: string } }) {
  const { userId } = z.object({ userId: z.string().uuid() }).parse(data);
  const { error } = await supabase.rpc("admin_reset_usage", { _user_id: userId });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function adminSetPremium({
  data,
}: {
  data: { userId: string; isPremium: boolean; expiresAt?: string | null };
}) {
  return adminSetPlan({
    data: {
      userId: data.userId,
      plan: data.isPremium ? "pro" : "free",
      expiresAt: data.expiresAt ?? null,
      status: data.isPremium ? "active" : "inactive",
    },
  });
}
