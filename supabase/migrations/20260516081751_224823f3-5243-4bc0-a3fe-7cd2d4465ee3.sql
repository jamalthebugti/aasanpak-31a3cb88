
CREATE TYPE public.generation_kind AS ENUM ('email','message','reply');

CREATE TABLE public.history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.generation_kind NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX history_user_created_idx ON public.history (user_id, created_at DESC);

ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.history FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.history FOR DELETE TO authenticated USING (auth.uid() = user_id);
