import type { ArchitectDecisionResponse } from "@backend/services/architect-service.js";

function hasDevelopmentLanguageInfo(goal: string): boolean {
  return /\b(type\s*script|javascript|node\.?js|bun|deno|react|vue|svelte|next\.?js|python|fastapi|django|flask|go|golang|rust|java|kotlin|swift|\.net|php|ruby|rails|elixir|phoenix|scala|spring|express|nestjs)\b/i.test(goal)
    || /(c#|타입스크립트|자바스크립트|파이썬|리액트|노드|스벨트|뷰\.js|러스트|자바|코틀린|스위프트)/i.test(goal);
}

function isDevelopmentLanguageDecision(decision: ArchitectDecisionResponse["decisions"][number]): boolean {
  const text = [
    decision.id,
    decision.title,
    decision.prompt,
    decision.section,
    ...decision.options.flatMap((option) => [option.label, option.detail, option.productRequirement])
  ].join(" ");
  return /\b(language|stack|framework|frontend|backend|typescript|javascript|python|node|react)\b/i.test(text)
    || /(개발\s*언어|기술\s*스택|프레임워크|프론트|백엔드)/i.test(text);
}

function buildDevelopmentLanguageDecision(locale: string): ArchitectDecisionResponse["decisions"][number] {
  if (locale === "ko") {
    return {
      id: "development-stack",
      title: "개발 언어와 스택",
      prompt: "첫 구현에 사용할 개발 언어와 애플리케이션 구성을 선택하세요.",
      section: "개발 언어",
      options: [
        {
          id: "typescript-fullstack",
          label: "TypeScript 풀스택",
          detail: "프론트엔드와 백엔드를 모두 TypeScript로 구성합니다.",
          productRequirement: "구현은 TypeScript를 기본 언어로 사용하고, 프론트엔드는 frontend/src 구조를 따르며 백엔드는 backend/src 구조를 따르는 풀스택 애플리케이션으로 구성해야 합니다."
        },
        {
          id: "typescript-frontend-backend-api",
          label: "TypeScript 프론트엔드 + API 백엔드",
          detail: "사용자 화면은 TypeScript 프론트엔드로 만들고 백엔드는 명확한 API 계층으로 분리합니다.",
          productRequirement: "구현은 TypeScript 프론트엔드를 frontend/src 아래에 두고, 필요한 백엔드 API는 backend/src/api와 backend/src/core를 중심으로 구성해야 합니다."
        },
        {
          id: "backend-first",
          label: "백엔드 우선",
          detail: "화면보다 API, 데이터 모델, 실행 흐름을 먼저 만듭니다.",
          productRequirement: "구현은 백엔드 중심으로 진행하고 backend/src 아래에 api, core, integrations, common, utils 책임을 명확히 분리해야 합니다."
        }
      ]
    };
  }

  return {
    id: "development-stack",
    title: "Development language and stack",
    prompt: "Choose the development language and application shape for the first implementation.",
    section: "Development language",
    options: [
      {
        id: "typescript-fullstack",
        label: "TypeScript full stack",
        detail: "Use TypeScript for both frontend and backend.",
        productRequirement: "Use TypeScript as the default implementation language, place frontend code under frontend/src, and place backend code under backend/src for a full-stack application."
      },
      {
        id: "typescript-frontend-backend-api",
        label: "TypeScript frontend + API backend",
        detail: "Build the user interface in TypeScript and keep backend API responsibilities explicit.",
        productRequirement: "Place the TypeScript frontend under frontend/src and organize required backend API work around backend/src/api and backend/src/core."
      },
      {
        id: "backend-first",
        label: "Backend first",
        detail: "Prioritize APIs, data models, and execution flow over screens.",
        productRequirement: "Implement the product as a backend-first system and organize backend/src into clear api, core, integrations, common, and utils responsibilities."
      }
    ]
  };
}

export function ensureDevelopmentLanguageDecision(response: ArchitectDecisionResponse, goal: string, locale: string): ArchitectDecisionResponse {
  if (hasDevelopmentLanguageInfo(goal) || response.decisions.some(isDevelopmentLanguageDecision)) {
    return response;
  }

  const languageDecision = buildDevelopmentLanguageDecision(locale);
  return {
    ...response,
    decisions: [
      languageDecision,
      ...response.decisions.filter((decision) => decision.id !== languageDecision.id)
    ].slice(0, 5)
  };
}
