import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchAppSettings, fetchCodexSettings, fetchProjectCodexSettings, saveAppSettings, saveCodexSettings, saveProjectCodexSettings } from "@/lib/api";
import type { AppConfig, CodexSettings } from "@/types/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/utils/cn";

const approvalOptions = ["never", "on-request", "untrusted"];
const sandboxOptions = ["workspace-write", "read-only", "danger-full-access"];
const reasoningOptions = ["low", "medium", "high", "xhigh"];

function SettingsSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-[1px] border-[3px] border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-sm font-bold text-[var(--foreground)] outline-none transition focus-visible:shadow-[var(--shadow-focus)]"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{value || "Not set"}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.25rem)] z-20 grid w-full border-[3px] border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-card)]">
          {options.map((option) => (
            <button
              type="button"
              className={cn(
                "px-3 py-2 text-left font-mono text-sm font-bold hover:bg-[var(--surface-hover)]",
                option === value && "bg-[var(--surface)]"
              )}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SettingsPage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const appQuery = useQuery({ queryKey: ["app-settings"], queryFn: fetchAppSettings });
  const codexQuery = useQuery({ queryKey: ["codex-settings"], queryFn: fetchCodexSettings });
  const projectCodexQuery = useQuery({
    queryKey: ["project-codex-settings", projectRoot],
    queryFn: () => fetchProjectCodexSettings(projectRoot),
    enabled: Boolean(projectRoot)
  });
  const [appSettings, setAppSettings] = useState<AppConfig | null>(null);
  const [codexSettings, setCodexSettings] = useState<CodexSettings | null>(null);
  const [projectCodexStatus, setProjectCodexStatus] = useState(projectCodexQuery.data ?? null);

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
  useEffect(() => {
    setProjectCodexStatus(projectCodexQuery.data ?? null);
  }, [projectCodexQuery.data]);

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
  const saveProjectCodexMutation = useMutation({
    mutationFn: async () => {
      if (!projectRoot) {
        throw new Error("No project selected");
      }
      return saveProjectCodexSettings(projectRoot);
    },
    onSuccess: (status) => setProjectCodexStatus(status)
  });

  const updateCodexDefaults = (next: Partial<CodexSettings["defaults"]>) => {
    if (!codexSettings) {
      return;
    }
    setCodexSettings({
      ...codexSettings,
      defaults: { ...codexSettings.defaults, ...next }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="CONFIG" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="flex flex-col gap-4 bg-[var(--panel)]">
          <h2 className="text-xl font-bold">App Settings</h2>
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
                <div>
                  <label className="mb-2 block text-sm font-medium">Skills Root</label>
                  <Input
                    value={appSettings.resourceRoots.skills}
                    onChange={(event) => setAppSettings({
                      ...appSettings,
                      resourceRoots: { ...appSettings.resourceRoots, skills: event.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Design Systems Root</label>
                  <Input
                    value={appSettings.resourceRoots.designSystems}
                    onChange={(event) => setAppSettings({
                      ...appSettings,
                      resourceRoots: { ...appSettings.resourceRoots, designSystems: event.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Design Templates Root</label>
                  <Input
                    value={appSettings.resourceRoots.designTemplates}
                    onChange={(event) => setAppSettings({
                      ...appSettings,
                      resourceRoots: { ...appSettings.resourceRoots, designTemplates: event.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Host</label>
                  <Input
                    value={appSettings.server.host}
                    onChange={(event) => setAppSettings({ ...appSettings, server: { ...appSettings.server, host: event.target.value } })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Port</label>
                  <Input
                    value={String(appSettings.server.port)}
                    onChange={(event) => setAppSettings({ ...appSettings, server: { ...appSettings.server, port: Number(event.target.value) || 0 } })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Max Iterations</label>
                  <Input value={String(appSettings.defaults.maxIters)} onChange={(event) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, maxIters: Number(event.target.value) || 0 } })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Stall Limit</label>
                  <Input value={String(appSettings.defaults.stallLimit)} onChange={(event) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, stallLimit: Number(event.target.value) || 0 } })} />
                </div>
                <SettingsSelect label="Default Approval" value={appSettings.defaults.approval} options={approvalOptions} onChange={(approval) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, approval } })} />
                <SettingsSelect label="Default Sandbox" value={appSettings.defaults.sandbox} options={sandboxOptions} onChange={(sandbox) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, sandbox } })} />
              </div>
              <Button className="self-start" onClick={() => saveAppMutation.mutate()}>앱 설정 저장</Button>
            </>
          ) : null}
        </Card>
        <Card className="flex flex-col gap-4 bg-[var(--panel)]">
          <h2 className="text-xl font-bold">Codex Settings</h2>
          {codexSettings ? (
            <>
              <section className="grid gap-3 border-[3px] border-[var(--border)] bg-[var(--panel)] p-4">
                <h3 className="text-base font-bold">Global Codex Settings</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Default Model</label>
                    <Input value={codexSettings.defaults.model ?? ""} placeholder="gpt-5.5" onChange={(event) => updateCodexDefaults({ model: event.target.value })} />
                  </div>
                  <SettingsSelect label="Reasoning Effort" value={codexSettings.defaults.modelReasoningEffort ?? ""} options={reasoningOptions} onChange={(modelReasoningEffort) => updateCodexDefaults({ modelReasoningEffort })} />
                  <SettingsSelect label="Approval Policy" value={codexSettings.defaults.approvalPolicy ?? ""} options={approvalOptions} onChange={(approvalPolicy) => updateCodexDefaults({ approvalPolicy })} />
                  <SettingsSelect label="Sandbox Mode" value={codexSettings.defaults.sandboxMode ?? ""} options={sandboxOptions} onChange={(sandboxMode) => updateCodexDefaults({ sandboxMode })} />
                  <div>
                    <label className="mb-2 block text-sm font-medium">Approvals Reviewer</label>
                    <Input value={codexSettings.defaults.approvalsReviewer ?? ""} placeholder="user" onChange={(event) => updateCodexDefaults({ approvalsReviewer: event.target.value })} />
                  </div>
                  <SettingsSelect label="Experimental Goals" value={codexSettings.defaults.goalsEnabled ? "enabled" : "disabled"} options={["enabled", "disabled"]} onChange={(value) => updateCodexDefaults({ goalsEnabled: value === "enabled" })} />
                </div>
              </section>
              <section className="grid gap-3 border-[3px] border-[var(--border)] bg-[var(--surface)] p-4">
                <h3 className="text-base font-bold">Project Codex Settings</h3>
                <div className="grid gap-2 text-sm">
                  <p><strong>Selected Project:</strong> {projectRoot || "No project selected"}</p>
                  <p><strong>Config Path:</strong> {projectCodexStatus?.configPath ?? (projectRoot ? `${projectRoot}/.codex/config.toml` : "No project selected")}</p>
                  <p><strong>Status:</strong> {projectCodexStatus?.exists ? "project config exists" : "project config not created"} / {projectCodexStatus?.trusted ? "trusted" : "not trusted"}</p>
                  <p><strong>Defaults:</strong> gpt-5.5 · high · danger-full-access · never · goals enabled</p>
                </div>
                <Button className="self-start" disabled={!projectRoot || saveProjectCodexMutation.isPending} onClick={() => saveProjectCodexMutation.mutate()}>
                  프로젝트 Codex 설정 생성
                </Button>
                {saveProjectCodexMutation.isSuccess ? <p className="text-sm font-bold text-[var(--success-foreground)]">프로젝트 config 생성됨 / trusted 등록됨</p> : null}
                {saveProjectCodexMutation.isError ? <p className="text-sm font-bold text-[var(--danger-foreground)]">{saveProjectCodexMutation.error instanceof Error ? saveProjectCodexMutation.error.message : "프로젝트 Codex 설정을 저장하지 못했습니다."}</p> : null}
              </section>
              <div className="grid gap-4">
                <h3 className="text-base font-bold">Model Providers</h3>
                {codexSettings.modelProviders.map((provider, index) => (
                  <div key={provider.id} className="rounded-md bg-[var(--surface)] p-4">
                    <label className="mb-2 block text-sm font-medium">Provider ID</label>
                    <Input value={provider.id} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.modelProviders[index].id = event.target.value;
                      setCodexSettings(next);
                    }} />
                    <label className="mb-2 mt-3 block text-sm font-medium">Base URL</label>
                    <Input className="mt-2" value={provider.baseUrl} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.modelProviders[index].baseUrl = event.target.value;
                      setCodexSettings(next);
                    }} />
                  </div>
                ))}
              </div>
              <div className="grid gap-4">
                <h3 className="text-base font-bold">Profiles</h3>
                {codexSettings.profiles.map((profile, index) => (
                  <div key={profile.id} className="rounded-md bg-[var(--surface)] p-4">
                    <label className="mb-2 block text-sm font-medium">Profile ID</label>
                    <Input value={profile.id} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.profiles[index].id = event.target.value;
                      setCodexSettings(next);
                    }} />
                    <label className="mb-2 mt-3 block text-sm font-medium">Model Provider</label>
                    <Input className="mt-2" value={profile.modelProvider} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.profiles[index].modelProvider = event.target.value;
                      setCodexSettings(next);
                    }} />
                    <label className="mb-2 mt-3 block text-sm font-medium">Model</label>
                    <Input className="mt-2" value={profile.model} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.profiles[index].model = event.target.value;
                      setCodexSettings(next);
                    }} />
                  </div>
                ))}
              </div>
              <Button className="self-start" onClick={() => saveCodexMutation.mutate()}>Codex 설정 저장</Button>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
