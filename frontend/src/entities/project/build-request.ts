export type BuildSource = "product-html" | "product-md";
export type BuildFocus = "faithful" | "polish" | "stability";

export const buildFocusOptions: Array<{
  id: BuildFocus;
  title: string;
  detail: string;
  requirement: string;
}> = [
  {
    id: "faithful",
    title: "Blueprint Faithful",
    detail: "PRODUCT 내용을 우선으로 기능을 정확히 구현합니다.",
    requirement: "Prioritize faithful implementation of the selected PRODUCT source."
  },
  {
    id: "polish",
    title: "Arcade Polish",
    detail: "UI 밀도, 버튼 크기, 인터랙션 완성도를 강하게 봅니다.",
    requirement: "Pay special attention to polished arcade-scale UI, interaction quality, and visual hierarchy."
  },
  {
    id: "stability",
    title: "Agent Hardening",
    detail: "검증, 에러 처리, 실행 안정성을 우선합니다.",
    requirement: "Prioritize validation, explicit failures, and stable build behavior."
  }
];

export function composeBuildProductContent({
  source,
  productMarkdown,
  additionalRequest,
  focus
}: {
  source: BuildSource;
  productMarkdown: string;
  additionalRequest: string;
  focus: BuildFocus;
}): string {
  const focusOption = buildFocusOptions.find((option) => option.id === focus);
  const sections = [
    source === "product-html"
      ? [
        "# PRODUCT",
        "",
        "Use PRODUCT.html in the project root as the canonical source for this BUILD run."
      ].join("\n")
      : productMarkdown.trim()
  ];

  if (focusOption) {
    sections.push(["## Build Focus", "", focusOption.requirement].join("\n"));
  }

  if (additionalRequest.trim()) {
    sections.push(["## Additional Build Request", "", additionalRequest.trim()].join("\n"));
  }

  return sections.filter(Boolean).join("\n\n");
}
