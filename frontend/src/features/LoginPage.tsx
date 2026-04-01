import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from "../lib/api";
import { Card } from "../components/ui/card";

export function LoginPage() {
  const query = useQuery({ queryKey: ["auth"], queryFn: fetchAuthStatus });

  return (
    <Card className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="text-sm text-[var(--muted-foreground)]">`~/.codex/auth.json` 존재 여부와 JSON 파싱 가능 여부만 검사합니다.</p>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
        <p className="font-medium">Path</p>
        <p className="text-sm">{query.data?.path ?? "확인 중..."}</p>
      </div>
      <div className={`rounded-xl p-4 text-sm ${query.data?.valid ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
        {query.data?.message ?? "상태를 불러오는 중입니다."}
      </div>
      {!query.data?.valid ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          파일 업로드는 앱 외부에서 처리해야 합니다. auth.json이 준비되기 전까지 Build/Update는 차단됩니다.
        </p>
      ) : null}
    </Card>
  );
}
