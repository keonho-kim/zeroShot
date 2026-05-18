import { defineTranslations } from "@/lib/i18n/define-translations";

export const updateTranslations = defineTranslations({
  en: {
    "update.needsBuild": "Run BUILD first.",
    "update.noSourceToUpdate": "No source code is available to update.",
    "update.pipeline": "Update pipeline",
    "update.completed": "Update completed",
    "update.failed": "Update failed",
    "update.running": "Update is running",
    "update.runningDetail": "Applying the selected update direction and validating the result.",
    "update.requestKicker": "Update request",
    "update.requestTitle": "What should change?",
    "update.requestDescription": "Codex will first turn your request into a few clear questions based on PRODUCT and the current source.",
    "update.latestRun": "Latest run",
    "update.sourceFiles": "Source files",
    "update.sourceSize": "Source size",
    "update.sourceMix": "Source mix",
    "update.noSource": "No source files detected.",
    "update.requestLabel": "Update request",
    "update.requestPlaceholder": "Describe what you want to change or improve.",
    "update.organizingQuestions": "Preparing update questions.",
    "update.generateQuestions": "Prepare questions",
    "update.generatingQuestions": "Preparing questions...",
    "update.decisions": "Update decisions",
    "update.ready": "Ready",
    "update.startTitle": "Start update",
    "update.startDetail": "Codex will write UPDATE.md from your answers, then run the update with tests and a PRODUCT spec cross-check.",
    "update.starting": "Starting update...",
    "update.start": "Start update",
    "update.choiceBoard": "Choice board",
    "update.requestEmpty": "Describe the update you want.",
    "update.decisionsRequired": "Answer the update questions before starting UPDATE.",
    "update.startError": "Could not start UPDATE."
  },
  ko: {
    "update.needsBuild": "BUILD를 먼저 실행하세요.",
    "update.noSourceToUpdate": "업데이트할 소스코드가 없습니다.",
    "update.pipeline": "업데이트 파이프라인",
    "update.completed": "Update 완료",
    "update.failed": "Update 실패",
    "update.running": "Update 실행 중",
    "update.runningDetail": "선택한 업데이트 방향을 적용하고 결과를 검증합니다.",
    "update.requestKicker": "업데이트 요청",
    "update.requestTitle": "변경할 내용을 입력하세요",
    "update.requestDescription": "Codex가 PRODUCT와 현재 소스 기준으로 필요한 질문을 먼저 정리합니다.",
    "update.latestRun": "최근 실행",
    "update.sourceFiles": "소스 파일",
    "update.sourceSize": "소스 크기",
    "update.sourceMix": "소스 구성",
    "update.noSource": "감지된 소스코드가 없습니다.",
    "update.requestLabel": "업데이트 요청",
    "update.requestPlaceholder": "변경하거나 보완할 내용을 입력하세요.",
    "update.organizingQuestions": "업데이트 질문을 정리하고 있습니다.",
    "update.generateQuestions": "질문 생성",
    "update.generatingQuestions": "질문 정리 중...",
    "update.decisions": "업데이트 선택",
    "update.ready": "준비됨",
    "update.startTitle": "UPDATE 시작",
    "update.startDetail": "선택한 답변을 UPDATE.md로 정리하고, 테스트 실행과 PRODUCT 기능 명세 교차확인을 포함해 업데이트를 진행합니다.",
    "update.starting": "UPDATE 시작 중...",
    "update.start": "UPDATE 시작",
    "update.choiceBoard": "선택 보드",
    "update.requestEmpty": "업데이트 요청을 입력하세요.",
    "update.decisionsRequired": "UPDATE를 시작하기 전에 질문에 모두 답하세요.",
    "update.startError": "UPDATE를 시작하지 못했습니다."
  },
  zh: {
    "update.requestTitle": "想改什么？",
    "update.requestDescription": "Codex 会先根据 PRODUCT 和当前源码整理几个清晰的问题。"
  },
  ja: {
    "update.requestTitle": "何を変更しますか？",
    "update.requestDescription": "Codex が PRODUCT と現在のソースをもとに、必要な質問を先に整理します。"
  },
  es: {
    "update.requestTitle": "¿Qué quieres cambiar?",
    "update.requestDescription": "Codex convertirá tu petición en unas pocas preguntas claras usando PRODUCT y el código actual."
  },
  de: {
    "update.requestTitle": "Was soll geändert werden?",
    "update.requestDescription": "Codex leitet aus PRODUCT und dem aktuellen Code zuerst klare Fragen ab."
  }
});
