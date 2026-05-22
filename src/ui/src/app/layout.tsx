import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { fetchAuthStatus, fetchCurrentJob } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";

export function AppLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const setAuthStatus = useAppStore((state) => state.setAuthStatus);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);

  const authQuery = useQuery({
    queryKey: ["auth"],
    queryFn: fetchAuthStatus
  });
  const jobQuery = useQuery({
    queryKey: ["job-current"],
    queryFn: fetchCurrentJob,
    refetchInterval: 5000
  });

  useEffect(() => {
    setAuthStatus(authQuery.data ?? null);
  }, [authQuery.data, setAuthStatus]);

  useEffect(() => {
    setCurrentJob(jobQuery.data ?? null);
  }, [jobQuery.data, setCurrentJob]);

  if (authQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-md bg-[var(--surface)] px-6 py-4 text-sm text-[var(--muted-foreground)]">
          {t("app.loadingAuth")}
        </div>
      </div>
    );
  }

  const authValid = authQuery.data?.valid === true;
  const isLoginRoute = location.pathname === "/login";
  const isHomeRoute = location.pathname === "/home";
  const isRootRoute = location.pathname === "/";

  if (isRootRoute) {
    return <Navigate to="/home" replace />;
  }

  if (!authValid && !isLoginRoute && !isHomeRoute) {
    return <Navigate to="/login" replace />;
  }

  if (authValid && isLoginRoute) {
    return <Navigate to="/home" replace />;
  }

  return (
    <main className="min-h-screen px-5 py-6 md:px-8 md:py-8">
      <Outlet />
    </main>
  );
}
