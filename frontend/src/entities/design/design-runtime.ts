import type { DesignRuntimeMode, DesignRuntimeResponse } from "@/types/api";

export interface DesignModeOption {
  id: DesignRuntimeMode;
  title: string;
  eyebrow: string;
  detail: string;
  output: string;
}

export const designModeOptions: DesignModeOption[] = [
  {
    id: "codex",
    title: "Codex Canvas",
    eyebrow: "GENERATE",
    detail: "제품 블루프린트와 디자인 템플릿을 바탕으로 구현 가능한 UI 지시를 만듭니다.",
    output: "Design brief, artifact contract, verification plan"
  },
  {
    id: "figma",
    title: "와이어 프레임",
    eyebrow: "EDIT",
    detail: "레이아웃, 컴포넌트 상태, 레이어 명명, 프로토타입 메모 중심으로 정리합니다.",
    output: "Wireframe map, component checklist, handoff notes"
  },
  {
    id: "powerpoint",
    title: "프레젠테이션",
    eyebrow: "EDIT",
    detail: "슬라이드 흐름, 편집 계층, 차트/표 자리표시자, 발표 리듬을 설계합니다.",
    output: "Presentation sequence, editorial hierarchy, export checks"
  }
];

export function designModeLabel(mode: DesignRuntimeMode): string {
  return designModeOptions.find((option) => option.id === mode)?.title ?? "Codex Canvas";
}

export function designResultStatus(design: DesignRuntimeResponse | null | undefined): string {
  if (!design) {
    return "WAIT";
  }
  return designModeLabel(design.mode);
}
