import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";

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
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

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
