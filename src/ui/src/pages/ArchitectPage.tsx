import { Send } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [omakaseMode, setOmakaseMode] = useState(false);

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
      requestKey: [projectRoot, locale, omakaseMode ? "omakase" : "guided", trimmed].join("\n"),
      omakaseMode
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
            <div className="build-choice-grid">
              <button
                type="button"
                className={omakaseMode ? "build-choice-card" : "build-choice-card selected"}
                onClick={() => setOmakaseMode(false)}
              >
                <span>{locale === "ko" ? "라운드 질문" : "Guided rounds"}</span>
                <small>{locale === "ko" ? "제품 개요, 상세, 개발 상세 질문을 순서대로 답합니다." : "Answer product overview, product detail, and development detail rounds."}</small>
              </button>
              <button
                type="button"
                className={omakaseMode ? "build-choice-card selected" : "build-choice-card"}
                onClick={() => setOmakaseMode(true)}
              >
                <span>{locale === "ko" ? "오마카세 모드" : "Omakase mode"}</span>
                <small>{locale === "ko" ? "Codex 추천 첫 선택지를 전부 자동으로 사용합니다." : "Use Codex's recommended first option for every question."}</small>
              </button>
            </div>
            <Textarea
              value={userBrief}
              onChange={(event) => setUserBrief(event.target.value)}
              placeholder={locale === "ko" ? "예: 기관 알림, 준비물, 일정, 선생님 메시지를 한곳에서 확인하고 바로 대응하는 보호자용 앱" : "Example: A parent app for checking school notices, supplies, schedules, and teacher messages in one place."}
            />
            <div className="decision-actions architect-input-actions">
              <Button type="button" disabled={!userBrief.trim()} onClick={startArchitectFlow}>
                <Send className="size-4" />
                {omakaseMode
                  ? (locale === "ko" ? "Codex에게 맡기기" : "Let Codex choose")
                  : (locale === "ko" ? "제품 방향 잡기" : "Shape product")}
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
