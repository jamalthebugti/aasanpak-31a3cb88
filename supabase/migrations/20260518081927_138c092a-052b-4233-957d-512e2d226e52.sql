
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin roles read" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin profile read" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (user_id, email)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Admin view of users for the admin panel (security definer function)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  is_premium BOOLEAN,
  premium_expires_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  month_generations BIGINT,
  month_regenerations BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id,
    p.email,
    p.is_premium,
    p.premium_expires_at,
    p.created_at,
    COALESCE(SUM(CASE WHEN COALESCE((h.meta->>'regenerate')::boolean, false) = false THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN COALESCE((h.meta->>'regenerate')::boolean, false) = true THEN 1 ELSE 0 END), 0)
  FROM public.profiles p
  LEFT JOIN public.history h
    ON h.user_id = p.user_id
   AND h.created_at >= date_trunc('month', now())
  GROUP BY p.user_id, p.email, p.is_premium, p.premium_expires_at, p.created_at
  ORDER BY p.created_at DESC;
END $$;

-- Admin set premium
CREATE OR REPLACE FUNCTION public.admin_set_premium(_user_id UUID, _is_premium BOOLEAN, _expires_at TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles
  SET is_premium = _is_premium,
      premium_expires_at = _expires_at,
      updated_at = now()
  WHERE user_id = _user_id;
END $$;

-- Admin stats
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE (total_users BIGINT, premium_users BIGINT, free_users BIGINT, month_generations BIGINT, month_regenerations BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.profiles WHERE is_premium = true AND (premium_expires_at IS NULL OR premium_expires_at > now())),
    (SELECT COUNT(*) FROM public.profiles WHERE is_premium = false OR (premium_expires_at IS NOT NULL AND premium_expires_at <= now())),
    (SELECT COUNT(*) FROM public.history WHERE created_at >= date_trunc('month', now()) AND COALESCE((meta->>'regenerate')::boolean, false) = false),
    (SELECT COUNT(*) FROM public.history WHERE created_at >= date_trunc('month', now()) AND COALESCE((meta->>'regenerate')::boolean, false) = true);
END $$;
