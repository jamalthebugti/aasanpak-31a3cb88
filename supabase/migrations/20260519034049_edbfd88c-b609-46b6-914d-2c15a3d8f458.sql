
-- Drop old admin functions so we can redefine with new return shape
DROP FUNCTION IF EXISTS public.admin_list_users();
DROP FUNCTION IF EXISTS public.admin_stats();

-- 1. Subscription plan enum
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('free','starter','pro','business');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan public.subscription_plan NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS activated_by_admin uuid,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- 3. Persistent usage counters
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  generations integer NOT NULL DEFAULT 0,
  regenerations integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_period ON public.usage_counters(user_id, period_start);
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own usage read" ON public.usage_counters;
CREATE POLICY "own usage read" ON public.usage_counters
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin usage read" ON public.usage_counters;
CREATE POLICY "admin usage read" ON public.usage_counters
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Subscription audit log
CREATE TABLE IF NOT EXISTS public.subscription_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  plan public.subscription_plan,
  expires_at timestamptz,
  performed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_user ON public.subscription_audit(user_id, created_at DESC);
ALTER TABLE public.subscription_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin audit read" ON public.subscription_audit;
CREATE POLICY "admin audit read" ON public.subscription_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Period helper
CREATE OR REPLACE FUNCTION public.current_period_start()
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT date_trunc('month', now())::date
$$;

-- 6. Increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(_user_id uuid, _is_regen boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_counters (user_id, period_start, generations, regenerations)
  VALUES (
    _user_id,
    public.current_period_start(),
    CASE WHEN _is_regen THEN 0 ELSE 1 END,
    CASE WHEN _is_regen THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
    SET generations   = public.usage_counters.generations   + CASE WHEN _is_regen THEN 0 ELSE 1 END,
        regenerations = public.usage_counters.regenerations + CASE WHEN _is_regen THEN 1 ELSE 0 END,
        updated_at = now();
END $$;

-- 7. Admin set plan
CREATE OR REPLACE FUNCTION public.admin_set_plan(
  _user_id uuid,
  _plan public.subscription_plan,
  _expires_at timestamptz,
  _status text DEFAULT 'active',
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _is_premium boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  _is_premium := _plan <> 'free' AND _status = 'active';
  UPDATE public.profiles
    SET plan = _plan,
        subscription_status = _status,
        is_premium = _is_premium,
        premium_expires_at = _expires_at,
        activated_by_admin = auth.uid(),
        activated_at = now(),
        updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.subscription_audit (user_id, action, plan, expires_at, performed_by, notes)
  VALUES (_user_id, 'set_plan:'||_status, _plan, _expires_at, auth.uid(), _notes);
END $$;

-- 8. Admin reset usage
CREATE OR REPLACE FUNCTION public.admin_reset_usage(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.usage_counters
    WHERE user_id = _user_id AND period_start = public.current_period_start();
  INSERT INTO public.subscription_audit (user_id, action, performed_by)
  VALUES (_user_id, 'reset_usage', auth.uid());
END $$;

-- 9. Upgraded admin_list_users
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  plan public.subscription_plan,
  subscription_status text,
  is_premium boolean,
  premium_expires_at timestamptz,
  signed_up_at timestamptz,
  activated_at timestamptz,
  month_generations integer,
  month_regenerations integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id, p.email, p.plan, p.subscription_status,
    p.is_premium, p.premium_expires_at, p.created_at, p.activated_at,
    COALESCE(u.generations, 0), COALESCE(u.regenerations, 0)
  FROM public.profiles p
  LEFT JOIN public.usage_counters u
    ON u.user_id = p.user_id AND u.period_start = public.current_period_start()
  ORDER BY p.created_at DESC;
END $$;

-- 10. Upgraded admin_stats
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE(
  total_users bigint,
  premium_users bigint,
  free_users bigint,
  month_generations bigint,
  month_regenerations bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.profiles WHERE is_premium = true AND (premium_expires_at IS NULL OR premium_expires_at > now())),
    (SELECT COUNT(*) FROM public.profiles WHERE is_premium = false OR (premium_expires_at IS NOT NULL AND premium_expires_at <= now())),
    (SELECT COALESCE(SUM(generations), 0)::bigint FROM public.usage_counters WHERE period_start = public.current_period_start()),
    (SELECT COALESCE(SUM(regenerations), 0)::bigint FROM public.usage_counters WHERE period_start = public.current_period_start());
END $$;
