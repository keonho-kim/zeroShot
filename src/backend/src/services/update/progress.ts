import type { ThreadEvent } from "@openai/codex-sdk";
import { textByLocale } from "@backend/i18n/locale";
import { describeCodexProgress } from "@backend/services/codex-progress/service";
import type { UpdateProgressEvent } from "@backend/services/update/types";

function progressText(locale: string, ko: string, en: string): string {
  return textByLocale(locale, { ko, en, zh: en, ja: en, es: en, de: en });
}

export function describeUpdateProgress(event: ThreadEvent, locale: string): UpdateProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "업데이트 분석 시작", "Update analysis started"),
      detail: progressText(locale, "요청을 PRODUCT와 현재 소스 기준으로 검토합니다.", "Reviewing the request against PRODUCT and current source."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "업데이트 질문 정리 중", "Preparing update questions"),
      detail: progressText(locale, "변경 범위, 검증 방법, 기능 명세 반영 여부를 분리하고 있습니다.", "Separating scope, validation, and product spec impact."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "validation",
      title: progressText(locale, "업데이트 선택지 준비 완료", "Update choices prepared"),
      detail: progressText(locale, "변경 범위를 고를 수 있도록 업데이트 질문을 정리했습니다.", "Prepared update questions for choosing the change scope."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "업데이트 질문 생성 실패", "Update question generation failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "error",
      title: progressText(locale, "업데이트 질문 생성 오류", "Update question generation error"),
      detail: event.message,
      status: "failed"
    };
  }
  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "업데이트 범위 검토", "Reviewing update scope"),
    reasoningDetail: progressText(locale, "요청이 바꾸는 기능, 검증 방법, PRODUCT 반영 여부를 분리하고 있습니다.", "Separating changed features, validation needs, and PRODUCT spec impact."),
    agentTitle: progressText(locale, "업데이트 선택지 응답 작성", "Writing update choices"),
    agentDetail: progressText(locale, "사용자가 고를 수 있는 업데이트 방향과 후속 실행 기준을 JSON 응답으로 작성하고 있습니다.", "Writing selectable update directions and execution criteria into the JSON response.")
  });
}
