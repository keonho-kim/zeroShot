import { Check, LogIn, Play, ScrollText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useHomePageController } from "@/pages/home/page-controller";
import { Button } from "@/shared/ui/button";
import { ProjectPickerModal } from "@/widgets/project-picker/ProjectPickerModal";

export function HomePage() {
  const { t } = useI18n();
  const controller = useHomePageController();

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
              variant={controller.authValid ? "outline" : "default"}
              disabled={controller.authValid}
              onClick={() => controller.navigate("/login")}
              className="landing-action-button"
            >
              {controller.authValid ? <Check aria-hidden="true" className="landing-login-check" /> : <LogIn aria-hidden="true" />}
              {controller.authValid ? t("home.loginComplete") : t("home.login")}
            </Button>
            <Button type="button" onClick={controller.openProjectPicker} className="landing-action-button">
              <Play aria-hidden="true" />
              {t("home.start")}
            </Button>
            <Button type="button" variant="outline" onClick={() => controller.navigate("/history")} className="landing-action-button">
              <ScrollText aria-hidden="true" />
              {t("home.workHistory")}
            </Button>
          </div>
        </div>
      </section>
      <ProjectPickerModal
        open={controller.isProjectPickerOpen}
        freshStart
        onProjectSelected={controller.onProjectSelected}
        onClose={controller.closeProjectPicker}
      />
    </div>
  );
}
