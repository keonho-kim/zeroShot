import type { ThreadEvent } from "@openai/codex-sdk";
import { textByLocale } from "@backend/i18n/locale";
import { describeCodexProgress } from "@backend/services/codex-progress-service";
import type { DesignProgressEvent } from "@backend/types/design";

function progressText(locale: string, ko: string, en: string): string {
  return textByLocale(locale, { ko, en, zh: en, ja: en, es: en, de: en });
}

export function describeDesignRuntimeProgress(event: ThreadEvent, locale: string): DesignProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "분석 중", "Analyzing"),
      detail: progressText(locale, "제품 설계와 선택 리소스를 디자인 작업대로 넘겼습니다.", "Product direction and selected resources are entering the design workbench."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "분석 중", "Analyzing"),
      detail: progressText(locale, "제품 블루프린트, 디자인 템플릿, 편집 모드를 정리하고 있습니다.", "Reading the product blueprint, design template, and editing mode."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "complete",
      title: progressText(locale, "완료", "Done"),
      detail: progressText(locale, "INTERACTIVE CANVAS로 저장할 DESIGN 산출물을 준비했습니다.", "Prepared the DESIGN artifact for INTERACTIVE CANVAS."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "실패", "Failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "failed",
      title: progressText(locale, "실패", "Failed"),
      detail: event.message,
      status: "failed"
    };
  }

  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "캔버스 변경 범위 검토", "Reviewing canvas change scope"),
    reasoningDetail: progressText(locale, "PRODUCT, 선택 리소스, 사용자 요청을 기준으로 수정할 화면 구조를 나누고 있습니다.", "Separating the target screen structure from PRODUCT, selected resources, and the user request."),
    agentTitle: progressText(locale, "INTERACTIVE CANVAS 응답 작성", "Writing INTERACTIVE CANVAS response"),
    agentDetail: progressText(locale, "DESIGN/index.html과 사용자에게 보여줄 상태 메시지를 JSON 응답으로 작성하고 있습니다.", "Writing DESIGN/index.html and the user-facing status message into the JSON response.")
  });
}

export function describeDesignRecommendationProgress(event: ThreadEvent, locale: string): DesignProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "디자인 추천 세션 시작", "Design recommendation started"),
      detail: progressText(locale, "제품 기획서와 로컬 디자인 자산을 추천 작업에 넘겼습니다.", "Product planning and local design resources are ready for recommendation."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "디자인 후보 정리 중", "Organizing design candidates"),
      detail: progressText(locale, "ARCHITECT 결과와 디자인 시스템, 템플릿 카탈로그를 비교하고 있습니다.", "Comparing ARCHITECT output with design systems and templates."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "complete",
      title: progressText(locale, "디자인 후보 준비 완료", "Design candidates ready"),
      detail: progressText(locale, "사용자가 고를 수 있는 디자인 기조와 화면 구성을 정리했습니다.", "Prepared design system and screen structure options."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "디자인 추천 실패", "Design recommendation failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "failed",
      title: progressText(locale, "디자인 추천 스트림 오류", "Design recommendation stream error"),
      detail: event.message,
      status: "failed"
    };
  }

  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "제품과 디자인 자산 매칭", "Matching product to design assets"),
    reasoningDetail: progressText(locale, "PRODUCT와 카탈로그를 비교해 어울리는 디자인 시스템과 템플릿 후보를 좁히고 있습니다.", "Comparing PRODUCT with the catalog to narrow design systems and templates."),
    agentTitle: progressText(locale, "추천 응답 작성", "Writing recommendation response"),
    agentDetail: progressText(locale, "추천 이유, 디자인 기조, 화면 구성을 사용자가 고를 수 있는 JSON 응답으로 작성하고 있습니다.", "Writing rationale, design direction, and screen structure options into the JSON response.")
  });
}
