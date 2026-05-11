import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AppLayout } from "./app/layout";
import { HomePage } from "./features/HomePage";
import { LoginPage } from "./features/LoginPage";
import { PipelinePage } from "./features/PipelinePage";
import { LogsPage } from "./features/LogsPage";
import { ArchitectPage } from "./features/ArchitectPage";
import { SettingsPage } from "./features/SettingsPage";
import "./styles/globals.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/build" element={<PipelinePage mode="build" />} />
            <Route path="/update" element={<PipelinePage mode="update" />} />
            <Route path="/architect" element={<ArchitectPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/history" element={<Navigate to="/logs" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
