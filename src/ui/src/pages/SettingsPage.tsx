import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchAppSettings, fetchCodexSettings, fetchProjectCodexSettings, saveAppSettings, saveCodexSettings, saveProjectCodexSettings } from "@/lib/api";
import type { AppConfig, CodexSettings } from "@/types/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-[1px] border-2 border-[var(--border)] bg-[var(--input)] px-2.5 py-1.5 font-mono text-xs font-bold text-[var(--foreground)] outline-none transition focus-visible:shadow-[var(--shadow-focus)]"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{value || t("common.notSet")}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.25rem)] z-20 grid w-full border-2 border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-card)]">
          {options.map((option) => (
            <button
              type="button"
              className={cn(
                "px-2.5 py-1.5 text-left font-mono text-xs font-bold hover:bg-[var(--surface-hover)]",
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
  const { t, languageLabel } = useI18n();
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
          <h2 className="text-xl font-bold">{t("settings.app")}</h2>
          {appSettings ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("settings.allowedRoots")}</label>
                <Input
                  value={appSettings.allowedRoots.join(",")}
                  onChange={(event) => setAppSettings({ ...appSettings, allowedRoots: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("settings.skillsRoot")}</label>
                  <Input
                    value={appSettings.resourceRoots.skills}
                    onChange={(event) => setAppSettings({
                      ...appSettings,
                      resourceRoots: { ...appSettings.resourceRoots, skills: event.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("settings.designSystemsRoot")}</label>
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
                  <label className="mb-2 block text-sm font-medium">{t("settings.designTemplatesRoot")}</label>
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
                  <label className="mb-2 block text-sm font-medium">{t("settings.host")}</label>
                  <Input
                    value={appSettings.server.host}
                    onChange={(event) => setAppSettings({ ...appSettings, server: { ...appSettings.server, host: event.target.value } })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("settings.port")}</label>
                  <Input
                    value={String(appSettings.server.port)}
                    onChange={(event) => setAppSettings({ ...appSettings, server: { ...appSettings.server, port: Number(event.target.value) || 0 } })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("settings.maxIterations")}</label>
                  <Input value={String(appSettings.defaults.maxIters)} onChange={(event) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, maxIters: Number(event.target.value) || 0 } })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("settings.stallLimit")}</label>
                  <Input value={String(appSettings.defaults.stallLimit)} onChange={(event) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, stallLimit: Number(event.target.value) || 0 } })} />
                </div>
                <SettingsSelect label={t("settings.defaultApproval")} value={appSettings.defaults.approval} options={approvalOptions} onChange={(approval) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, approval } })} />
                <SettingsSelect label={t("settings.defaultSandbox")} value={appSettings.defaults.sandbox} options={sandboxOptions} onChange={(sandbox) => setAppSettings({ ...appSettings, defaults: { ...appSettings.defaults, sandbox } })} />
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">{t("settings.uiLanguage")}: {languageLabel}</p>
              <Button className="self-start" onClick={() => saveAppMutation.mutate()}>{t("settings.saveApp")}</Button>
            </>
          ) : null}
        </Card>
        <Card className="flex flex-col gap-4 bg-[var(--panel)]">
          <h2 className="text-xl font-bold">{t("settings.codex")}</h2>
          {codexSettings ? (
            <>
              <section className="grid gap-3 border-2 border-[var(--border)] bg-[var(--panel)] p-3">
                <h3 className="text-base font-bold">{t("settings.globalCodex")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">{t("settings.defaultModel")}</label>
                    <Input value={codexSettings.defaults.model ?? ""} placeholder="gpt-5.5" onChange={(event) => updateCodexDefaults({ model: event.target.value })} />
                  </div>
                  <SettingsSelect label={t("settings.reasoning")} value={codexSettings.defaults.modelReasoningEffort ?? ""} options={reasoningOptions} onChange={(modelReasoningEffort) => updateCodexDefaults({ modelReasoningEffort })} />
                  <SettingsSelect label={t("settings.approvalPolicy")} value={codexSettings.defaults.approvalPolicy ?? ""} options={approvalOptions} onChange={(approvalPolicy) => updateCodexDefaults({ approvalPolicy })} />
                  <SettingsSelect label={t("settings.sandboxMode")} value={codexSettings.defaults.sandboxMode ?? ""} options={sandboxOptions} onChange={(sandboxMode) => updateCodexDefaults({ sandboxMode })} />
                  <div>
                    <label className="mb-2 block text-sm font-medium">{t("settings.approvalsReviewer")}</label>
                    <Input value={codexSettings.defaults.approvalsReviewer ?? ""} placeholder="user" onChange={(event) => updateCodexDefaults({ approvalsReviewer: event.target.value })} />
                  </div>
                  <SettingsSelect label={t("settings.experimentalGoals")} value={codexSettings.defaults.goalsEnabled ? "enabled" : "disabled"} options={["enabled", "disabled"]} onChange={(value) => updateCodexDefaults({ goalsEnabled: value === "enabled" })} />
                </div>
              </section>
              <section className="grid gap-3 border-2 border-[var(--border)] bg-[var(--surface)] p-3">
                <h3 className="text-base font-bold">{t("settings.projectCodex")}</h3>
                <div className="grid gap-2 text-sm">
                  <p><strong>{t("settings.selectedProject")}:</strong> {projectRoot || t("settings.noProject")}</p>
                  <p><strong>{t("settings.configPath")}:</strong> {projectCodexStatus?.configPath ?? (projectRoot ? `${projectRoot}/.codex/config.toml` : t("settings.noProject"))}</p>
                  <p><strong>{t("settings.status")}:</strong> {projectCodexStatus?.exists ? t("settings.configExists") : t("settings.configMissing")} / {projectCodexStatus?.trusted ? t("settings.trusted") : t("settings.notTrusted")}</p>
                  <p><strong>{t("settings.defaults")}:</strong> gpt-5.5 · high · danger-full-access · never · {t("settings.goalsEnabled")}</p>
                </div>
                <Button className="self-start" disabled={!projectRoot || saveProjectCodexMutation.isPending} onClick={() => saveProjectCodexMutation.mutate()}>
                  {t("settings.createProjectCodex")}
                </Button>
                {saveProjectCodexMutation.isSuccess ? <p className="text-sm font-bold text-[var(--success-foreground)]">{t("settings.projectCodexCreated")}</p> : null}
                {saveProjectCodexMutation.isError ? <p className="text-sm font-bold text-[var(--danger-foreground)]">{saveProjectCodexMutation.error instanceof Error ? saveProjectCodexMutation.error.message : t("settings.projectCodexError")}</p> : null}
              </section>
              <div className="grid gap-4">
                <h3 className="text-base font-bold">{t("settings.providers")}</h3>
                {codexSettings.modelProviders.map((provider, index) => (
                  <div key={provider.id} className="rounded-md bg-[var(--surface)] p-4">
                    <label className="mb-2 block text-sm font-medium">{t("settings.providerId")}</label>
                    <Input value={provider.id} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.modelProviders[index].id = event.target.value;
                      setCodexSettings(next);
                    }} />
                    <label className="mb-2 mt-3 block text-sm font-medium">{t("settings.baseUrl")}</label>
                    <Input className="mt-2" value={provider.baseUrl} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.modelProviders[index].baseUrl = event.target.value;
                      setCodexSettings(next);
                    }} />
                  </div>
                ))}
              </div>
              <div className="grid gap-4">
                <h3 className="text-base font-bold">{t("settings.profiles")}</h3>
                {codexSettings.profiles.map((profile, index) => (
                  <div key={profile.id} className="rounded-md bg-[var(--surface)] p-4">
                    <label className="mb-2 block text-sm font-medium">{t("settings.profileId")}</label>
                    <Input value={profile.id} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.profiles[index].id = event.target.value;
                      setCodexSettings(next);
                    }} />
                    <label className="mb-2 mt-3 block text-sm font-medium">{t("settings.modelProvider")}</label>
                    <Input className="mt-2" value={profile.modelProvider} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.profiles[index].modelProvider = event.target.value;
                      setCodexSettings(next);
                    }} />
                    <label className="mb-2 mt-3 block text-sm font-medium">{t("settings.model")}</label>
                    <Input className="mt-2" value={profile.model} onChange={(event) => {
                      const next = structuredClone(codexSettings);
                      next.profiles[index].model = event.target.value;
                      setCodexSettings(next);
                    }} />
                  </div>
                ))}
              </div>
              <Button className="self-start" onClick={() => saveCodexMutation.mutate()}>{t("settings.saveCodex")}</Button>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
