import { AlertCircle } from "lucide-react";

export function ArtifactRequiredState() {
  return (
    <div className="design-empty-source">
      <AlertCircle aria-hidden="true" />
      <strong>PRODUCT BLUEPRINT가 필요합니다</strong>
      <span>ARCHITECT에서 제품 블루프린트를 먼저 만든 뒤 DESIGN을 실행할 수 있습니다.</span>
    </div>
  );
}
