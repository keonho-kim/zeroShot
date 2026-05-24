import { approvalOptions, reasoningOptions, sandboxOptions } from "@/pages/settings/const/options";
import { SettingsSelect } from "@/pages/settings/SettingsSelect";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import type { CodexSettings, ProjectCodexSettingsStatus } from "@/types/api";

export function CodexSettingsPanel({
  codexSettings,
  onCreateProjectCodex,
  onSaveCodex,
  projectCodexStatus,
  projectRoot,
  projectCodexPending,
  projectCodexError,
  projectCodexSuccess,
  setCodexSettings,
  updateCodexDefaults
}: {
  codexSettings: CodexSettings | null;
  onCreateProjectCodex: () => void;
  onSaveCodex: () => void;
  projectCodexStatus: ProjectCodexSettingsStatus | null;
  projectRoot: string;
  projectCodexPending: boolean;
  projectCodexError: unknown;
  projectCodexSuccess: boolean;
  setCodexSettings: (settings: CodexSettings) => void;
  updateCodexDefaults: (next: Partial<CodexSettings["defaults"]>) => void;
}) {
  const { t } = useI18n();
  return (
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
            <Button className="self-start" disabled={!projectRoot || projectCodexPending} onClick={onCreateProjectCodex}>
              {t("settings.createProjectCodex")}
            </Button>
            {projectCodexSuccess ? <p className="text-sm font-bold text-[var(--success-foreground)]">{t("settings.projectCodexCreated")}</p> : null}
            {projectCodexError ? <p className="text-sm font-bold text-[var(--danger-foreground)]">{projectCodexError instanceof Error ? projectCodexError.message : t("settings.projectCodexError")}</p> : null}
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
          <Button className="self-start" onClick={onSaveCodex}>{t("settings.saveCodex")}</Button>
        </>
      ) : null}
    </Card>
  );
}
