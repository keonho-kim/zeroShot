import { House, SlidersHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="page-header mb-8">
      <div className="page-header-inner">
        <Button
          variant="ghost"
          onClick={() => navigate("/home")}
          className="nav-tile"
          aria-label="Home"
          title="Home"
        >
          <House aria-hidden="true" />
          <span>HOME</span>
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
          <Button variant="outline" asChild className="nav-tile" aria-label="Config" title="Config">
            <Link to="/settings">
              <SlidersHorizontal aria-hidden="true" />
              <span>CONFIG</span>
            </Link>
          </Button>
        ) : (
          <span className="nav-tile-spacer" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
