import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchAuthStatus, fetchCurrentJob } from "../lib/api";
import { useAppStore } from "./store";
import { ProjectBrowser } from "../components/ProjectBrowser";

const links = [
  ["login", "Login"],
  ["build", "Build"],
  ["update", "Update"],
  ["history", "History"],
  ["editor", "Editor"],
  ["settings", "Settings"]
] as const;

export function AppLayout() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectRoot = useAppStore((state) => state.setProjectRoot);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);

  const authQuery = useQuery({ queryKey: ["auth"], queryFn: fetchAuthStatus });
  const jobQuery = useQuery({
    queryKey: ["job-current"],
    queryFn: fetchCurrentJob,
    refetchInterval: 5000
  });

  useEffect(() => {
    setCurrentJob(jobQuery.data ?? null);
  }, [jobQuery.data, setCurrentJob]);

  return (
    <div className="grid min-h-screen grid-cols-[320px_1fr]">
      <aside className="border-r border-[var(--border)] bg-white/60 p-6 backdrop-blur">
        <div className="mb-6">
          <p className="text-2xl font-black tracking-tight">ZeroShot</p>
          <p className="text-sm text-[var(--muted-foreground)]">운영형 CLI + 웹 콘솔</p>
        </div>
        <nav className="mb-6 grid gap-2">
          {links.map(([path, label]) => (
            <NavLink
              key={path}
              to={`/${path}`}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium ${isActive ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--muted)]"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <ProjectBrowser value={projectRoot} onChange={setProjectRoot} />
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4 text-sm">
          <p className="font-semibold">Auth 상태</p>
          <p className={authQuery.data?.valid ? "text-emerald-600" : "text-rose-600"}>{authQuery.data?.message ?? "확인 중..."}</p>
        </div>
      </aside>
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}
