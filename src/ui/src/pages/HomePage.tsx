import { Check, LogIn, Play, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProjectPickerModal } from "@/components/ProjectPickerModal";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import { useBodyClass } from "@/hooks/useBodyClass";

export function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const authStatus = useAppStore((state) => state.authStatus);
  const isProjectPickerOpen = useAppStore((state) => state.isProjectPickerOpen);
  const setProjectPickerOpen = useAppStore((state) => state.setProjectPickerOpen);
  const setProjectBrowserPath = useAppStore((state) => state.setProjectBrowserPath);
  const setCandidateProjectPath = useAppStore((state) => state.setCandidateProjectPath);
  const setSelectedBrowserEntryPath = useAppStore((state) => state.setSelectedBrowserEntryPath);
  const setProjectPickerHistory = useAppStore((state) => state.setProjectPickerHistory);
  const setProjectPickerHistoryIndex = useAppStore((state) => state.setProjectPickerHistoryIndex);

  useBodyClass("home-page");

  const authValid = authStatus?.valid === true;
  const openProjectPicker = () => {
    setProjectBrowserPath("");
    setCandidateProjectPath("");
    setSelectedBrowserEntryPath("");
    setProjectPickerHistory([]);
    setProjectPickerHistoryIndex(-1);
    setProjectPickerOpen(true);
  };

  return (
    <div className="home-shell landing-shell mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <section className="landing-hero" aria-label={t("home.landingAria")}>
        <div className="landing-hero-body">
          <div className="landing-hero-copy">
            <h1 className="landing-title">ZERO SHOT</h1>
          </div>
          <div className="landing-actions" aria-label={t("home.primaryActions")}>
            <Button
              type="button"
              variant={authValid ? "outline" : "default"}
              disabled={authValid}
              onClick={() => navigate("/login")}
              className="landing-action-button"
            >
              {authValid ? <Check aria-hidden="true" className="landing-login-check" /> : <LogIn aria-hidden="true" />}
              {authValid ? t("home.loginComplete") : t("home.login")}
            </Button>
            <Button type="button" onClick={openProjectPicker} className="landing-action-button">
              <Play aria-hidden="true" />
              {t("home.start")}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/logs")} className="landing-action-button">
              <ScrollText aria-hidden="true" />
              {t("home.workHistory")}
            </Button>
          </div>
        </div>
      </section>
      <ProjectPickerModal
        open={isProjectPickerOpen}
        freshStart
        onProjectSelected={() => navigate("/start-mode")}
        onClose={() => {
          setProjectPickerOpen(false);
        }}
      />
    </div>
  );
}
