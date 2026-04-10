import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchProjectTree } from "../lib/api";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

interface Props {
  value: string;
  onChange: (path: string) => void;
  className?: string;
}

export function ProjectBrowser({ value, onChange, className }: Props) {
  const [path, setPath] = useState<string>("");
  const query = useQuery({
    queryKey: ["project-tree", path],
    queryFn: () => fetchProjectTree(path || undefined)
  });

  return (
    <Card className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">Project Cards</p>
          <p className="text-sm text-[var(--muted-foreground)]">{path || "Allowed roots"}</p>
        </div>
        <div className="flex gap-2">
          {path ? <Button variant="outline" onClick={() => onChange(path)}>현재 경로 선택</Button> : null}
          {path ? <Button variant="outline" onClick={() => setPath("")}>루트 목록</Button> : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.entries.map((entry) => (
          <div key={entry.path} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
            <button className="w-full text-left" onClick={() => setPath(entry.path)}>
              <p className="text-sm font-semibold">{entry.name}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{entry.path}</p>
            </button>
            <div className="mt-4 flex justify-end">
              <Button variant={value === entry.path ? "default" : "outline"} onClick={() => onChange(entry.path)}>
                {value === entry.path ? "선택됨" : "선택"}
              </Button>
            </div>
          </div>
        ))}
        {!query.data?.entries.length ? <p className="text-sm text-[var(--muted-foreground)]">표시할 디렉터리가 없습니다.</p> : null}
      </div>
    </Card>
  );
}
