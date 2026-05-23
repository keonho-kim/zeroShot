import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/app-store";
import { useArchitectFlowStore } from "@/stores/architect-store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchProductArtifact } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function ArchitectPage() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const userBrief = useArchitectFlowStore((state) => state.userBrief);
  const setUserBrief = useArchitectFlowStore((state) => state.setUserBrief);
  const prepareRequest = useArchitectFlowStore((state) => state.prepareRequest);
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
      omakaseMode: false
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
      requestKey: [projectRoot, locale, "guided", trimmed].join("\n"),
      omakaseMode: false
    });
    navigate("/architect/progress");
  };

  return (
    <div className="builder-shell architect-page">
      <PageHeader title="ARCHITECT" projectRoot={projectRoot} />
      <div className={existingProductHtml ? "architect-chat architect-existing-product-chat" : "architect-chat"}>
        <section className="architect-thread" aria-label="Architect conversation">
          {productArtifactQuery.isLoading ? (
            <Card className="architect-loading-card" aria-label={t("common.loading")}>
              <div className="agent-loading-stage">
                <span className="agent-dot-wave" aria-hidden="true"><i /><i /><i /></span>
                <h2>{t("common.loading")}</h2>
              </div>
            </Card>
          ) : existingProductHtml ? (
            <Card className="architect-input-card architect-existing-product-card">
              <div>
                <p className="decision-kicker">{t("architect.productBlueprint")}</p>
                <h2>{t("architect.chatTitle")}</h2>
                <p>{t("architect.existingDescription")}</p>
              </div>
              <div className="chat-bubble assistant">
                {t("architect.existingAssistant")}
              </div>
              <Textarea
                value={existingProductRequest}
                onChange={(event) => setExistingProductRequest(event.target.value)}
                placeholder={t("architect.existingPlaceholder")}
              />
              <div className="decision-actions architect-input-actions">
                <Button type="button" onClick={continueFromExistingProduct}>
                  <Send className="size-4" />
                  {t("architect.send")}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="architect-input-card">
              <div>
                <p className="decision-kicker">{t("architect.productBrief")}</p>
                <h2>{t("architect.promptTitle")}</h2>
                <p>{t("architect.promptDescription")}</p>
              </div>
              <Textarea
                value={userBrief}
                onChange={(event) => setUserBrief(event.target.value)}
                placeholder={t("architect.briefPlaceholder")}
              />
              <div className="decision-actions architect-input-actions">
                <Button type="button" disabled={!userBrief.trim()} onClick={startArchitectFlow}>
                  <Send className="size-4" />
                  {t("architect.shapeProduct")}
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
