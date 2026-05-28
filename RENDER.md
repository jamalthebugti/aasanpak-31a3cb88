# Deploying to Render (Standalone, No Lovable Required)

This app is a TanStack Start project. In the Lovable IDE it currently
builds for Cloudflare Workers via `@lovable.dev/vite-tanstack-config`.
To self-host on Render with a Node server, do the following **after**
exporting the repo to your own GitHub.

## 1. Replace `vite.config.ts`

Swap the Lovable preset for the upstream TanStack Start Vite plugin:

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({ target: "node-server" }),
    viteReact(),
  ],
});
```

Then:

```bash
bun remove @lovable.dev/vite-tanstack-config @cloudflare/vite-plugin
bun add -d @tanstack/react-start @vitejs/plugin-react @tailwindcss/vite vite-tsconfig-paths
rm wrangler.jsonc
```

## 2. Update `package.json` scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node .output/server/index.mjs"
  }
}
```

## 3. Configure Render

Create a **Web Service** on Render pointing at your GitHub repo:

- **Build command:** `bun install && bun run build`
- **Start command:** `bun run start` (or `npm start`)
- **Node version:** 20+

## 4. Environment variables (set in Render dashboard)

Required at runtime:

| Name | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → API (anon key) |
| `SUPABASE_URL` | same value as above |
| `SUPABASE_PUBLISHABLE_KEY` | same value as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (service_role) — **server-only** |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |

`VITE_*` variables are inlined at build time, the rest are read at runtime.

## 5. Supabase configuration

- Email auth: enabled (default)
- Email confirmation: your choice — admin-created users skip confirmation automatically (`email_confirm: true` is passed server-side).
- Add your Render domain to **Auth → URL Configuration → Site URL** and **Redirect URLs**.

## 6. First admin user

1. Sign up normally through the UI (or insert via Supabase dashboard).
2. In Supabase SQL editor:
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<your-auth-uid>', 'admin');
   ```
3. Log in → visit `/admin` → use **Create user** to provision everyone else.

## What was removed

- `src/integrations/lovable/` (Google OAuth broker — replace with raw `supabase.auth.signInWithOAuth("google")` if you want Google back)
- `src/lib/ai-gateway.ts` (unused Lovable AI Gateway helper — Gemini is called directly in `src/lib/generate.functions.ts`)

No code paths in the app depend on Lovable services after these removals.
The auto-generated files under `src/integrations/supabase/` are plain
Supabase clients and work in any environment.