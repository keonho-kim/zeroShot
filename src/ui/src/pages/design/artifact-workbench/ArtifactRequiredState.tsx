import { AlertCircle } from "lucide-react";

export function ArtifactRequiredState() {
  return (
    <div className="design-empty-source">
      <AlertCircle aria-hidden="true" />
      <strong>DESIGN 산출물이 필요합니다</strong>
      <span>DESIGN을 실행하면 INTERACTIVE CANVAS가 생성되고 상호작용형 수정을 시작할 수 있습니다.</span>
    </div>
  );
}
