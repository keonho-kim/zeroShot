import { House, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

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
    <div className="page-header mb-8 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/home")}
          className="icon-button"
          aria-label="Home"
          title="Home"
        >
          <House aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {projectRoot ? (
            <p className="project-chip mt-2" title={projectRoot}>
              {formatProjectLabel(projectRoot)}
            </p>
          ) : null}
        </div>
      </div>
      {rightAction === "settings" ? (
        <Button variant="outline" asChild className="icon-button" aria-label="Settings" title="Settings">
          <Link to="/settings">
            <Settings aria-hidden="true" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
