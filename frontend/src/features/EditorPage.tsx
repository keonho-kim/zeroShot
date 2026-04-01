import Editor from "@monaco-editor/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAppStore } from "../app/store";
import { fetchFile, saveFile } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export function EditorPage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const [currentPath, setCurrentPath] = useState("");
  const [draft, setDraft] = useState("");

  const fileQuery = useQuery({
    queryKey: ["file", projectRoot, currentPath],
    queryFn: () => fetchFile(projectRoot, currentPath),
    enabled: Boolean(projectRoot)
  });

  const mutation = useMutation({
    mutationFn: () => saveFile(projectRoot, currentPath, draft)
  });

  const entries = useMemo(() => (fileQuery.data?.kind === "directory" ? fileQuery.data.entries ?? [] : []), [fileQuery.data]);

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Card className="space-y-3">
        <h1 className="text-xl font-bold">Editor</h1>
        <p className="text-sm text-[var(--muted-foreground)]">`.work.history`는 제외되며 프로젝트 루트 이하 파일만 편집할 수 있습니다.</p>
        <div className="grid gap-2">
          <Button variant="outline" onClick={() => setCurrentPath("")}>루트</Button>
          {entries.map((entry) => (
            <Button
              key={entry.path}
              variant="outline"
              className="justify-start"
              onClick={() => {
                setCurrentPath(entry.relativePath);
                if (!entry.isDirectory) {
                  setDraft("");
                }
              }}
            >
              {entry.isDirectory ? "📁" : "📄"} {entry.name}
            </Button>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{currentPath || "(root)"}</p>
          {fileQuery.data?.kind === "file" ? <Button onClick={() => mutation.mutate()}>저장</Button> : null}
        </div>
        {fileQuery.data?.kind === "file" ? (
          <Editor
            height="70vh"
            path={currentPath}
            value={draft || fileQuery.data.content}
            onChange={(value) => setDraft(value ?? "")}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-sm text-[var(--muted-foreground)]">
            파일을 선택하면 Monaco Editor가 표시됩니다.
          </div>
        )}
      </Card>
    </div>
  );
}
