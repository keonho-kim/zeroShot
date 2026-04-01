import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchProjectTree } from "../lib/api";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface Props {
  value: string;
  onChange: (path: string) => void;
}

export function ProjectBrowser({ value, onChange }: Props) {
  const [path, setPath] = useState<string>("");
  const query = useQuery({
    queryKey: ["project-tree", path],
    queryFn: () => fetchProjectTree(path || undefined)
  });

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Project Root Browser</p>
          <p className="text-xs text-[var(--muted-foreground)]">{path || "Allowed roots"}</p>
        </div>
        <div className="flex gap-2">
          {path ? <Button variant="outline" onClick={() => onChange(path)}>현재 경로 선택</Button> : null}
          {path ? <Button variant="outline" onClick={() => setPath("")}>루트 목록</Button> : null}
        </div>
      </div>
      <div className="grid gap-2">
        {query.data?.entries.map((entry) => (
          <div key={entry.path} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
            <button className="text-left text-sm font-medium" onClick={() => setPath(entry.path)}>
              {entry.name}
            </button>
            <Button variant={value === entry.path ? "default" : "outline"} onClick={() => onChange(entry.path)}>
              {value === entry.path ? "선택됨" : "선택"}
            </Button>
          </div>
        ))}
        {!query.data?.entries.length ? <p className="text-sm text-[var(--muted-foreground)]">표시할 디렉터리가 없습니다.</p> : null}
      </div>
    </Card>
  );
}
