import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchAuthStatus, saveAuthStatus } from "@/lib/api/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function LoginPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["auth"], queryFn: fetchAuthStatus });
  const [draft, setDraft] = useState("");

  const mutation = useMutation({
    mutationFn: async () => saveAuthStatus(draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      setDraft("");
      navigate("/home", { replace: true });
    }
  });

  if (query.data?.valid) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <Card className="flex w-full max-w-3xl flex-col gap-5 bg-[var(--panel)] p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{t("login.kicker")}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em]">{t("login.title")}</h1>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">{t("login.description")}</p>
        </div>
        <div className="rounded-md bg-[var(--surface)] p-4">
          <p className="font-medium">{t("login.path")}</p>
          <p className="text-sm">{query.data?.path ?? t("login.checking")}</p>
        </div>
        <div className="rounded-md bg-[var(--danger-surface)] p-4 text-sm text-[var(--danger-foreground)]">
          {query.data?.message ?? t("login.loadingStatus")}
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) {
                setDraft(await file.text());
              }
            }}
          />
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder='{"api_key":"..."}' />
          <Button disabled={!draft.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? t("login.saving") : t("login.submit")}
          </Button>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("login.savedWhere")}
          </p>
        </div>
      </Card>
    </div>
  );
}
