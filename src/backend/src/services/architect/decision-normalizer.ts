import { textByLocale } from "@backend/i18n/locale";
import type { ArchitectDecisionResponse } from "@backend/services/architect/const/schemas";

function omakaseOption(locale: string): ArchitectDecisionResponse["decisions"][number]["options"][number] {
  return {
    id: "omakase",
    label: textByLocale(locale, {
      ko: "알아서 해주세요",
      en: "Let Codex choose",
      zh: "让 Codex 决定",
      ja: "Codex に任せる",
      es: "Que Codex elija",
      de: "Codex entscheiden lassen"
    }),
    detail: textByLocale(locale, {
      ko: "Codex 추천안을 그대로 사용합니다.",
      en: "Use the recommended option as-is.",
      zh: "直接使用推荐方案。",
      ja: "おすすめの案をそのまま使います。",
      es: "Usar la opción recomendada tal cual.",
      de: "Die empfohlene Option unverändert verwenden."
    }),
    productRequirement: "Use the recommended first option for this decision."
  };
}

export function normalizeArchitectDecisions(response: ArchitectDecisionResponse, locale: string): ArchitectDecisionResponse {
  return {
    ...response,
    decisions: response.decisions.map((decision) => {
      const concreteOptions = decision.options
        .filter((option) => option.id !== "omakase")
        .slice(0, 5);
      return {
        ...decision,
        options: [...concreteOptions, omakaseOption(locale)]
      };
    })
  };
}
