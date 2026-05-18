import { useQuery } from "@tanstack/react-query";
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
import { fetchProductArtifact } from "@/lib/api";

export function ArchitectPage() {
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const locale = useMemo(() => detectLocale(navigator.language), []);
  const userBrief = useArchitectFlowStore((state) => state.userBrief);
  const setUserBrief = useArchitectFlowStore((state) => state.setUserBrief);
  const prepareRequest = useArchitectFlowStore((state) => state.prepareRequest);
  const [omakaseMode, setOmakaseMode] = useState(false);
  const [existingProductRequest, setExistingProductRequest] = useState("");

  const productArtifactQuery = useQuery({
    queryKey: ["product-artifact", projectRoot],
    queryFn: () => fetchProductArtifact(projectRoot),
    enabled: Boolean(projectRoot),
    retry: false
  });
  const existingProductHtml = productArtifactQuery.data?.content.trim() ? productArtifactQuery.data.content : "";

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const continueFromExistingProduct = () => {
    const trimmed = existingProductRequest.trim();
    if (!trimmed) {
      navigate("/makeover");
      return;
    }

    prepareRequest({
      brief: [
        "Existing PRODUCT BLUEPRINT update request:",
        trimmed,
        "",
        "Current ARCHITECT/PRODUCT.html source:",
        existingProductHtml
      ].join("\n"),
      requestKey: [projectRoot, locale, "existing-product-chat", trimmed, productArtifactQuery.data?.etag ?? existingProductHtml.length].join("\n"),
      omakaseMode: true
    });
    navigate("/architect/progress");
  };

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
      <div className={existingProductHtml ? "architect-chat architect-existing-product-chat" : "architect-chat"}>
        <section className="architect-thread" aria-label="Architect conversation">
          {productArtifactQuery.isLoading ? (
            <Card className="architect-loading-card" aria-label="Product blueprint loading">
              <div className="agent-loading-stage">
                <span className="agent-dot-wave" aria-hidden="true"><i /><i /><i /></span>
                <h2>LOADING</h2>
              </div>
            </Card>
          ) : existingProductHtml ? (
            <Card className="architect-input-card architect-existing-product-card">
              <div>
                <p className="decision-kicker">Product blueprint</p>
                <h2>챗 UI</h2>
                <p>기존 PRODUCT BLUEPRINT가 준비되어 있습니다. 바꾸고 싶은 방향을 입력하면 ARCHITECT가 다시 정리하고, 빈칸으로 보내면 현재 PRODUCT를 유지하고 MAKEOVER로 이어갑니다.</p>
              </div>
              <div className="chat-bubble assistant">
                기존 PRODUCT를 기준으로 다음 작업을 이어갈 수 있습니다. 새 요구사항을 적거나 빈칸으로 전송해 MAKEOVER로 이동하세요.
              </div>
              <Textarea
                value={existingProductRequest}
                onChange={(event) => setExistingProductRequest(event.target.value)}
                placeholder="예: RSS URL 등록 흐름을 더 단순하게 만들고, 번역 상태를 첫 화면에서 더 잘 보이게 정리해줘."
              />
              <div className="decision-actions architect-input-actions">
                <Button type="button" onClick={continueFromExistingProduct}>
                  <Send className="size-4" />
                  전송
                </Button>
              </div>
            </Card>
          ) : (
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
                  <span>{locale === "ko" ? "같이 설계하기" : "Plan Together"}</span>
                  <small>{locale === "ko" ? "제품 개요, 상세, 개발 상세 질문을 순서대로 답합니다." : "Answer product overview, product detail, and development detail rounds."}</small>
                </button>
                <button
                  type="button"
                  className={omakaseMode ? "build-choice-card selected" : "build-choice-card"}
                  onClick={() => setOmakaseMode(true)}
                >
                  <span>{locale === "ko" ? "오마카세 모드" : "Omakase mode"}</span>
                  <small>
                    {locale === "ko"
                      ? "AI 에이전트가 요구사항부터 기능 구성까지 알아서 판단해 설계를 완성합니다."
                      : "AI agent decides everything from requirements to feature structure and completes the design."}
                  </small>
                </button>
              </div>
              <Textarea
                value={userBrief}
                onChange={(event) => setUserBrief(event.target.value)}
                placeholder={
                  locale === "ko"
                    ? "어떤 앱을 만들고 싶나요? 대충 적어도 괜찮아요. 예: 헬스장 회원 예약 앱"
                    : "What kind of app do you want to build? Rough ideas are fine. Example: A booking app for gym members."
                }
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
          )}
        </section>
        {existingProductHtml ? (
          <section className="product-html-preview architect-design-preview architect-existing-product-preview" aria-label="Existing PRODUCT preview">
            <iframe title="Existing PRODUCT BLUEPRINT preview" srcDoc={existingProductHtml} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
