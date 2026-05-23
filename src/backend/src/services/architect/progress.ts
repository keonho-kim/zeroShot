import type { ThreadEvent } from "@openai/codex-sdk";
import { textByLocale } from "@backend/i18n/locale";
import { describeCodexProgress } from "@backend/services/codex-progress-service";

export interface ArchitectProgressEvent {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

function progressText(locale: string, ko: string, en: string): string {
  return textByLocale(locale, { ko, en, zh: en, ja: en, es: en, de: en });
}

export function describeArchitectDecisionProgress(event: ThreadEvent, locale: string): ArchitectProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "제품 분석 세션 시작", "Product analysis started"),
      detail: progressText(locale, "입력한 설명을 제품 기획 흐름으로 넘겼습니다.", "Your brief is being prepared for product planning."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "요구사항 분석 중", "Analyzing requirements"),
      detail: progressText(locale, "대상 사용자, 핵심 문제, 필요한 첫 동작을 분리하고 있습니다.", "Identifying the target user, core problem, and first actions."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "validation",
      title: progressText(locale, "제품 방향 검토 완료", "Product direction reviewed"),
      detail: progressText(locale, "사용자가 고를 수 있는 제품 방향 선택지를 정리했습니다.", "Prepared the product direction options."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "제품 방향 정리 실패", "Product planning failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "failed",
      title: progressText(locale, "스트림 오류", "Stream error"),
      detail: event.message,
      status: "failed"
    };
  }

  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "제품 선택 기준 검토", "Reviewing product decision criteria"),
    reasoningDetail: progressText(locale, "입력 설명에서 사용자를 나누고 선택이 필요한 제품 축을 추리고 있습니다.", "Separating users from the brief and finding product axes that need a decision."),
    agentTitle: progressText(locale, "선택지 응답 작성", "Writing product options"),
    agentDetail: progressText(locale, "사용자가 바로 고를 수 있는 선택지와 구현 요구사항을 JSON 응답으로 작성하고 있습니다.", "Writing selectable options and implementation requirements into the JSON response.")
  });
}

export function describeArchitectProductHtmlProgress(event: ThreadEvent, locale: string): ArchitectProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "product-session",
      title: progressText(locale, "PRODUCT.html 생성 시작", "PRODUCT.html generation started"),
      detail: progressText(locale, "선택한 답변과 제품 방향을 문서 작성 작업으로 넘겼습니다.", "Your choices and product direction are being prepared for the document."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "product-writing",
      title: progressText(locale, "제품 블루프린트 작성 중", "Writing the product blueprint"),
      detail: progressText(locale, "제품 구조, 핵심 기능, 화면 흐름을 PRODUCT.html로 정리하고 있습니다.", "Organizing product structure, core features, and screen flows into PRODUCT.html."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "product-validation",
      title: progressText(locale, "PRODUCT.html 검토 완료", "PRODUCT.html reviewed"),
      detail: progressText(locale, "제품 블루프린트 문서를 작성하고 결과를 검토했습니다.", "Prepared and reviewed the product blueprint document."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "product-failed",
      title: progressText(locale, "PRODUCT.html 생성 실패", "PRODUCT.html generation failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "product-failed",
      title: progressText(locale, "스트림 오류", "Stream error"),
      detail: event.message,
      status: "failed"
    };
  }

  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "제품 문서 구조 설계", "Structuring the product document"),
    reasoningDetail: progressText(locale, "선택한 답변을 기능 명세, 화면 흐름, 수용 기준 섹션으로 나누고 있습니다.", "Turning selected answers into feature specs, screen flows, and acceptance criteria."),
    agentTitle: progressText(locale, "PRODUCT.html 응답 작성", "Writing PRODUCT.html response"),
    agentDetail: progressText(locale, "DESIGN과 BUILD가 참고할 제품 블루프린트 HTML과 상태 메시지를 작성하고 있습니다.", "Writing the product blueprint HTML and status message for Design and Build.")
  });
}
