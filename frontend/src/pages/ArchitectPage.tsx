import { Send } from "lucide-react";
import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/app-store";
import { useArchitectFlowStore } from "@/stores/architect-store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { detectLocale } from "@/entities/architect/architect-core";

export function ArchitectPage() {
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const locale = useMemo(() => detectLocale(navigator.language), []);
  const userBrief = useArchitectFlowStore((state) => state.userBrief);
  const setUserBrief = useArchitectFlowStore((state) => state.setUserBrief);
  const prepareRequest = useArchitectFlowStore((state) => state.prepareRequest);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const startArchitectFlow = () => {
    const trimmed = userBrief.trim();
    if (!trimmed) {
      return;
    }

    prepareRequest({
      brief: trimmed,
      requestKey: [projectRoot, locale, trimmed].join("\n")
    });
    navigate("/architect/progress");
  };

  return (
    <div className="builder-shell architect-page">
      <PageHeader title="ARCHITECT" projectRoot={projectRoot} />
      <div className="architect-chat">
        <section className="architect-thread" aria-label="Architect conversation">
          <Card className="architect-input-card">
            <div>
              <p className="decision-kicker">{locale === "ko" ? "Product brief" : "Product brief"}</p>
              <h2>{locale === "ko" ? "어떤 제품을 만들까요?" : "What product should we shape?"}</h2>
              <p>{locale === "ko" ? "대상 사용자, 해결할 문제, 첫 화면에서 필요한 행동을 적어주세요." : "Describe the user, problem, and first actions the product should support."}</p>
            </div>
            <Textarea
              value={userBrief}
              onChange={(event) => setUserBrief(event.target.value)}
              placeholder={locale === "ko" ? "예: 기관 알림, 준비물, 일정, 선생님 메시지를 한곳에서 확인하고 바로 대응하는 보호자용 앱" : "Example: A parent app for checking school notices, supplies, schedules, and teacher messages in one place."}
            />
            <div className="decision-actions architect-input-actions">
              <Button type="button" disabled={!userBrief.trim()} onClick={startArchitectFlow}>
                <Send className="size-4" />
                {locale === "ko" ? "제품 방향 잡기" : "Shape product"}
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
