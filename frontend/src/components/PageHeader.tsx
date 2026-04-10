import { House, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface Props {
  title: string;
  projectRoot?: string;
  rightAction?: "settings";
}

export function PageHeader({ title, projectRoot, rightAction }: Props) {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Button variant="ghost" onClick={() => navigate("/home")} className="-ml-3">
          <House className="size-4" />
          HOME
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          {projectRoot ? <p className="text-sm text-[var(--muted-foreground)]">{projectRoot}</p> : null}
        </div>
      </div>
      {rightAction === "settings" ? (
        <Button variant="outline" asChild>
          <Link to="/settings">
            <Settings className="size-4" />
            SETTING
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
