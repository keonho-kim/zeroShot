import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchAppSettings, fetchCodexSettings, saveAppSettings, saveCodexSettings, type AppConfig, type CodexSettings } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

export function SettingsPage() {
  const appQuery = useQuery({ queryKey: ["app-settings"], queryFn: fetchAppSettings });
  const codexQuery = useQuery({ queryKey: ["codex-settings"], queryFn: fetchCodexSettings });
  const [appSettings, setAppSettings] = useState<AppConfig | null>(null);
  const [codexSettings, setCodexSettings] = useState<CodexSettings | null>(null);

  useEffect(() => {
    if (appQuery.data) {
      setAppSettings(appQuery.data);
    }
  }, [appQuery.data]);
  useEffect(() => {
    if (codexQuery.data) {
      setCodexSettings(codexQuery.data);
    }
  }, [codexQuery.data]);

  const saveAppMutation = useMutation({
    mutationFn: async () => {
      if (appSettings) {
        await saveAppSettings(appSettings);
      }
    }
  });
  const saveCodexMutation = useMutation({
    mutationFn: async () => {
      if (codexSettings) {
        await saveCodexSettings(codexSettings);
      }
    }
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold">App Settings</h1>
        {appSettings ? (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium">Allowed Roots (comma separated)</label>
              <Input
                value={appSettings.allowedRoots.join(",")}
                onChange={(event) => setAppSettings({ ...appSettings, allowedRoots: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input value={String(appSettings.defaults.maxIters)} onChange={(event) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, maxIters: Number(event.target.value) || 0 } })} />
              <Input value={String(appSettings.defaults.stallLimit)} onChange={(event) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, stallLimit: Number(event.target.value) || 0 } })} />
              <Select value={appSettings.defaults.approval} onChange={(event) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, approval: event.target.value } })}>
                <option value="never">never</option>
                <option value="on-request">on-request</option>
                <option value="untrusted">untrusted</option>
              </Select>
              <Select value={appSettings.defaults.sandbox} onChange={(event) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, sandbox: event.target.value } })}>
                <option value="workspace-write">workspace-write</option>
                <option value="read-only">read-only</option>
                <option value="danger-full-access">danger-full-access</option>
              </Select>
            </div>
            <Button onClick={() => saveAppMutation.mutate()}>앱 설정 저장</Button>
          </>
        ) : null}
      </Card>
      <Card className="space-y-4">
        <h1 className="text-xl font-bold">Codex Settings</h1>
        {codexSettings ? (
          <>
            <div className="grid gap-4">
              {codexSettings.modelProviders.map((provider, index) => (
                <div key={provider.id} className="rounded-xl border border-[var(--border)] p-4">
                  <Input value={provider.id} onChange={(event) => {
                    const next = structuredClone(codexSettings);
                    next.modelProviders[index].id = event.target.value;
                    setCodexSettings(next);
                  }} />
                  <Input className="mt-2" value={provider.baseUrl} onChange={(event) => {
                    const next = structuredClone(codexSettings);
                    next.modelProviders[index].baseUrl = event.target.value;
                    setCodexSettings(next);
                  }} />
                </div>
              ))}
            </div>
            <div className="grid gap-4">
              {codexSettings.profiles.map((profile, index) => (
                <div key={profile.id} className="rounded-xl border border-[var(--border)] p-4">
                  <Input value={profile.id} onChange={(event) => {
                    const next = structuredClone(codexSettings);
                    next.profiles[index].id = event.target.value;
                    setCodexSettings(next);
                  }} />
                  <Input className="mt-2" value={profile.modelProvider} onChange={(event) => {
                    const next = structuredClone(codexSettings);
                    next.profiles[index].modelProvider = event.target.value;
                    setCodexSettings(next);
                  }} />
                  <Input className="mt-2" value={profile.model} onChange={(event) => {
                    const next = structuredClone(codexSettings);
                    next.profiles[index].model = event.target.value;
                    setCodexSettings(next);
                  }} />
                </div>
              ))}
            </div>
            <Button onClick={() => saveCodexMutation.mutate()}>Codex 설정 저장</Button>
          </>
        ) : null}
      </Card>
    </div>
  );
}
