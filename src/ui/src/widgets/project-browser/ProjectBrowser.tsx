import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchProjectTree } from "@/lib/api/projects";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

interface Props {
  value: string;
  onChange: (path: string) => void;
  className?: string;
}

export function ProjectBrowser({ value, onChange, className }: Props) {
  const { t } = useI18n();
  const [path, setPath] = useState<string>("");
  const query = useQuery({
    queryKey: ["project-tree", path],
    queryFn: () => fetchProjectTree(path || undefined)
  });

  return (
    <Card className={cn("flex flex-col gap-4 bg-[var(--panel)]", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{t("common.project")}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{path || t("settings.allowedRoots")}</p>
        </div>
        <div className="flex gap-2">
          {path ? <Button variant="outline" onClick={() => onChange(path)}>{t("projectBrowser.currentPath")}</Button> : null}
          {path ? <Button variant="outline" onClick={() => setPath("")}>{t("projectBrowser.rootList")}</Button> : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.entries.map((entry) => (
          <div key={entry.path} className="rounded-md bg-[var(--surface)] p-4">
            <button className="w-full text-left" onClick={() => setPath(entry.path)}>
              <p className="text-sm font-semibold">{entry.name}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{entry.path}</p>
            </button>
            <div className="mt-4 flex justify-end">
              <Button variant={value === entry.path ? "default" : "outline"} onClick={() => onChange(entry.path)}>
                {value === entry.path ? t("projectBrowser.selected") : t("projectBrowser.select")}
              </Button>
            </div>
          </div>
        ))}
        {!query.data?.entries.length ? <p className="text-sm text-[var(--muted-foreground)]">{t("projectBrowser.noDirectories")}</p> : null}
      </div>
    </Card>
  );
}
