import { House, SlidersHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface Props {
  title: string;
  projectRoot?: string;
  rightAction?: "settings";
}

function formatProjectLabel(projectRoot: string): string {
  const parts = projectRoot.split("/").filter(Boolean);
  return parts.at(-1) || projectRoot;
}

export function PageHeader({ title, projectRoot, rightAction }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="page-header mb-8">
      <div className="page-header-inner">
        <Button
          variant="ghost"
          onClick={() => navigate("/home")}
          className="nav-tile"
          aria-label={t("common.home")}
          title={t("common.home")}
        >
          <House aria-hidden="true" />
          <span>{t("common.home")}</span>
        </Button>
        <div className="page-title-block">
          <h1 className="page-title">{title}</h1>
          {projectRoot ? (
            <p className="project-chip mt-2" title={projectRoot}>
              {formatProjectLabel(projectRoot)}
            </p>
          ) : null}
        </div>
        {rightAction === "settings" ? (
          <Button variant="outline" asChild className="nav-tile" aria-label={t("common.config")} title={t("common.config")}>
            <Link to="/settings">
              <SlidersHorizontal aria-hidden="true" />
              <span>{t("common.config")}</span>
            </Link>
          </Button>
        ) : (
          <span className="nav-tile-spacer" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
