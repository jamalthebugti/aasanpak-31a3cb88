import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Admin access required.");
}

export const adminCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export const adminGetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_stats");
    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("admin_list_users");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const PlanEnum = z.enum(["free", "starter", "pro", "premium", "business"]);
const StatusEnum = z.enum(["active", "suspended", "inactive"]);

export const adminSetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        plan: PlanEnum,
        expiresAt: z.string().datetime().nullable().optional(),
        status: StatusEnum.optional().default("active"),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("admin_set_plan", {
      _user_id: data.userId,
      _plan: data.plan,
      _expires_at: (data.expiresAt ?? null) as any,
      _status: data.status,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("admin_reset_usage", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Legacy export kept so old imports don't break; routes through new function.
export const adminSetPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        isPremium: z.boolean(),
        expiresAt: z.string().datetime().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("admin_set_plan", {
      _user_id: data.userId,
      _plan: data.isPremium ? "pro" : "free",
      _expires_at: (data.expiresAt ?? null) as any,
      _status: data.isPremium ? "active" : "inactive",
      _notes: undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin creates a new user (auto-confirmed) and optionally assigns a plan.
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(255),
        password: z.string().min(6).max(128),
        fullName: z.string().max(120).optional(),
        plan: PlanEnum.default("free"),
        durationDays: z.number().int().min(1).max(3650).nullable().optional(),
        makeAdmin: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    // 1. Create the auth user with email already confirmed.
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: data.fullName ? { full_name: data.fullName } : undefined,
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Failed to create user");
    }
    const newUserId = created.user.id;

    // 2. Ensure the profile row exists (handle_new_user trigger usually creates it,
    //    but we upsert defensively in case the trigger is missing).
    await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: newUserId, email: data.email }, { onConflict: "user_id" });

    // 3. Assign plan + expiry via the existing RPC.
    if (data.plan !== "free") {
      const expiresAt = data.durationDays
        ? new Date(Date.now() + data.durationDays * 86400_000).toISOString()
        : null;
      // Call via the user-authed client so auth.uid() is the calling admin.
      const { error: planErr } = await context.supabase.rpc("admin_set_plan", {
        _user_id: newUserId,
        _plan: data.plan,
        _expires_at: expiresAt as any,
        _status: "active",
        _notes: "Created by admin",
      });
      if (planErr) throw new Error(planErr.message);
    }

    // 4. Optional admin role.
    if (data.makeAdmin) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: newUserId, role: "admin" }, { onConflict: "user_id,role" });
    }

    return { ok: true, userId: newUserId };
  });
