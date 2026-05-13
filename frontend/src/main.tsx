import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/app/layout";
import "@/styles/globals.css";

const HomePage = lazy(() => import("@/pages/HomePage").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const LogsPage = lazy(() => import("@/pages/LogsPage").then((module) => ({ default: module.LogsPage })));
const ArchitectPage = lazy(() => import("@/pages/ArchitectPage").then((module) => ({ default: module.ArchitectPage })));
const DesignPage = lazy(() => import("@/pages/DesignPage").then((module) => ({ default: module.DesignPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const PipelinePage = lazy(() => import("@/pages/PipelinePage").then((module) => ({ default: module.PipelinePage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5_000,
      gcTime: 5 * 60_000
    }
  }
});

function RouteFallback() {
  return <div className="builder-shell">Loading...</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/build" element={<PipelinePage mode="build" />} />
              <Route path="/update" element={<PipelinePage mode="update" />} />
              <Route path="/architect" element={<ArchitectPage />} />
              <Route path="/design" element={<DesignPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/history" element={<Navigate to="/logs" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
