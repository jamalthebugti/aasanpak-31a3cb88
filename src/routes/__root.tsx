import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <Link to="/" className="mt-6 inline-block px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Aassan Pak — AI English in your language" },
      { name: "description", content: "Aassan Pak turns Roman Urdu, Urdu, Hindi, Punjabi or English into clean professional English emails, messages and replies." },
      { name: "theme-color", content: "#0f7d8a" },
      { property: "og:title", content: "Aassan Pak — AI English in your language" },
      { name: "twitter:title", content: "Aassan Pak — AI English in your language" },
      { property: "og:description", content: "Aassan Pak turns Roman Urdu, Urdu, Hindi, Punjabi or English into clean professional English emails, messages and replies." },
      { name: "twitter:description", content: "Aassan Pak turns Roman Urdu, Urdu, Hindi, Punjabi or English into clean professional English emails, messages and replies." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bf4b353e-c998-42fe-8818-8ebce0b0f456/id-preview-3ad3ca8c--121a5241-2182-4e57-a6a7-e35691a38ac1.lovable.app-1779092655268.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bf4b353e-c998-42fe-8818-8ebce0b0f456/id-preview-3ad3ca8c--121a5241-2182-4e57-a6a7-e35691a38ac1.lovable.app-1779092655268.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  const loc = useLocation();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const isAuthPage = loc.pathname === "/auth";
    if (!user && !isAuthPage) router.navigate({ to: "/auth" });
    if (user && isAuthPage) router.navigate({ to: "/" });
  }, [user, loading, loc.pathname, router]);

  // restore theme
  useEffect(() => {
    const stored = localStorage.getItem("ap-theme");
    const dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  // invalidate on auth change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => router.invalidate());
    return () => subscription.unsubscribe();
  }, [router]);

  const showNav = !!user && loc.pathname !== "/auth";

  return (
    <div className="app-shell">
      <Outlet />
      {showNav && <BottomNav />}
      <Toaster position="top-center" richColors />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
