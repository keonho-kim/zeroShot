import { useI18n } from "@/lib/i18n";
import { AppSettingsPanel } from "@/pages/settings/AppSettingsPanel";
import { CodexSettingsPanel } from "@/pages/settings/CodexSettingsPanel";
import { useSettingsPageController } from "@/pages/settings/page-controller";
import { PageHeader } from "@/shared/ui/PageHeader";

export function SettingsPage() {
  const { languageLabel } = useI18n();
  const controller = useSettingsPageController();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="CONFIG" />
      <div className="grid gap-6 xl:grid-cols-2">
        <AppSettingsPanel
          appSettings={controller.appSettings}
          languageLabel={languageLabel}
          onSave={() => controller.saveAppMutation.mutate()}
          setAppSettings={controller.setAppSettings}
        />
        <CodexSettingsPanel
          codexSettings={controller.codexSettings}
          onCreateProjectCodex={() => controller.saveProjectCodexMutation.mutate()}
          onSaveCodex={() => controller.saveCodexMutation.mutate()}
          projectCodexStatus={controller.projectCodexStatus}
          projectRoot={controller.projectRoot}
          projectCodexPending={controller.saveProjectCodexMutation.isPending}
          projectCodexError={controller.saveProjectCodexMutation.error}
          projectCodexSuccess={controller.saveProjectCodexMutation.isSuccess}
          setCodexSettings={controller.setCodexSettings}
          updateCodexDefaults={controller.updateCodexDefaults}
        />
      </div>
    </div>
  );
}
