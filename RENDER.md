# Deploying as a Static SPA (Render, Netlify, Vercel, GitHub Pages…)

This project is a plain Vite SPA. `bun run build` produces a static
`dist/` folder; serve it from any static host.

## Build settings

- **Install command:** `bun install`
- **Build command:** `bun run build`
- **Publish directory:** `dist`
- **SPA rewrite:** all paths → `/index.html` (required for client-side routing)

On Render, create a **Static Site** (not Web Service) and add a rewrite
rule: source `/*` → destination `/index.html` status `200`.

## Environment variables (set at build time)

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → API (anon key) |
| `VITE_GEMINI_API_KEY` | https://aistudio.google.com/apikey |

All three are inlined into the JS bundle by Vite — they are visible to
anyone who inspects the site. Use the Supabase anon (publishable) key,
never the service-role key. The Gemini key will also be public; restrict
it in the Google Cloud console (HTTP referrer = your domain) to prevent
abuse, or proxy it through a small server if you need tighter control.

## Supabase setup

- Enable email/password auth. Email confirmation is your choice.
- Add your published domain to **Auth → URL Configuration → Site URL**
  and **Redirect URLs**.
- All admin actions go through `SECURITY DEFINER` RPCs that check
  `has_role(auth.uid(), 'admin')` server-side — safe to call from the
  browser with the anon key.

## First admin user

1. Sign up normally through the UI.
2. In Supabase SQL editor:
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<your-auth-uid>', 'admin');
   ```
3. Log in → visit `/admin`. New users sign up themselves; promote them
   to a paid plan from the admin dashboard.

## What was removed for SPA mode

- `src/server.ts`, `src/start.ts` — TanStack Start SSR entry points
- `src/integrations/supabase/auth-middleware.ts` / `auth-attacher.ts` /
  `client.server.ts` — server-only Supabase clients (service-role key
  cannot exist in a browser bundle)
- `src/lib/error-page.ts` / `error-capture.ts` — SSR error fallbacks
- `wrangler.jsonc`, `@lovable.dev/vite-tanstack-config`,
  `@cloudflare/vite-plugin` — Cloudflare Workers build target
- Admin "Create user" UI — required the service role; users now
  self-register via `/auth` and are promoted by an admin afterwards