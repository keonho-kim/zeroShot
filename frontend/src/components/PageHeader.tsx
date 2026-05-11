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
    <div className="mb-8 flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" onClick={() => navigate("/home")} className="-ml-3 text-xs tracking-[0.08em]">
          <House className="size-4" />
          HOME
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)] md:text-3xl">{title}</h1>
          {projectRoot ? <p className="mt-1 break-all text-sm text-[var(--muted-foreground)]">{projectRoot}</p> : null}
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
