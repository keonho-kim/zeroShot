import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { setupMonaco } from "./lib/monaco";
import { AppLayout } from "./app/layout";
import { HomePage } from "./features/HomePage";
import { LoginPage } from "./features/LoginPage";
import { PipelinePage } from "./features/PipelinePage";
import { LogsPage } from "./features/LogsPage";
import { EditorPage } from "./features/EditorPage";
import { SettingsPage } from "./features/SettingsPage";
import "./styles/globals.css";

setupMonaco();

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
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/history" element={<Navigate to="/logs" replace />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
