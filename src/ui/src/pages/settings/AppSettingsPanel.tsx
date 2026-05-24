import { approvalOptions, sandboxOptions } from "@/pages/settings/const/options";
import { SettingsSelect } from "@/pages/settings/SettingsSelect";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useI18n } from "@/lib/i18n";
import type { AppConfig } from "@/types/api";

export function AppSettingsPanel({
  appSettings,
  languageLabel,
  onSave,
  setAppSettings
}: {
  appSettings: AppConfig | null;
  languageLabel: string;
  onSave: () => void;
  setAppSettings: (settings: AppConfig) => void;
}) {
  const { t } = useI18n();
  return (
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
          <Button className="self-start" onClick={onSave}>{t("settings.saveApp")}</Button>
        </>
      ) : null}
    </Card>
  );
}
