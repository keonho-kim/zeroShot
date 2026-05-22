import { defineTranslations } from "@/lib/i18n/define-translations";

export const buildTranslations = defineTranslations({
  en: {
    "build.pipeline": "Build pipeline",
    "build.startTitle": "Start build",
    "build.startDescription": "Start implementation from the current product spec and design canvas.",
    "build.agent": "Codex agent",
    "build.completed": "Build completed",
    "build.failed": "Build failed",
    "build.running": "Build is running",
    "build.runningDetail": "Building from the product spec and design canvas.",
    "build.testSpec": "Test + spec check",
    "build.disabled": "BUILD needs a product spec or a workspace with files.",
    "build.starting": "Starting build..."
  },
  ko: {
    "build.pipeline": "빌드 파이프라인",
    "build.startTitle": "BUILD 시작",
    "build.startDescription": "현재 PRODUCT 명세와 DESIGN 캔버스를 참고해 구현 작업을 시작합니다.",
    "build.agent": "Codex 에이전트",
    "build.completed": "Build 완료",
    "build.failed": "Build 실패",
    "build.running": "Build 실행 중",
    "build.runningDetail": "PRODUCT 명세와 DESIGN 캔버스를 기준으로 구현 작업을 진행합니다.",
    "build.testSpec": "테스트와 명세 확인",
    "build.disabled": "BUILD에는 PRODUCT 명세 또는 비어 있지 않은 워크스페이스가 필요합니다.",
    "build.starting": "BUILD 시작 중..."
  },
  zh: {
    "build.startDescription": "从当前产品规格和设计画布开始实现。"
  },
  ja: {
    "build.startDescription": "現在のプロダクト仕様とデザインキャンバスをもとに実装を始めます。"
  },
  es: {
    "build.startDescription": "Empieza la implementación con la especificación del producto y el canvas de diseño actuales."
  },
  de: {
    "build.startDescription": "Starte die Umsetzung mit aktueller Produktspezifikation und Design-Canvas."
  }
});
