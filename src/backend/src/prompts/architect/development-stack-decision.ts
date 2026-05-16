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
          productRequirement: "구현은 TypeScript를 기본 언어로 사용하고, 프론트엔드는 src/ui/src 구조를 따르며 백엔드는 src/server/src 구조를 따르는 풀스택 애플리케이션으로 구성해야 합니다."
        },
        {
          id: "python-fastapi-react",
          label: "Python FastAPI + React",
          detail: "백엔드는 Python API, 프론트엔드는 React로 구성합니다.",
          productRequirement: "구현은 Python FastAPI 백엔드를 src/server 아래에 두고 React 프론트엔드를 src/ui 아래에 두는 풀스택 애플리케이션으로 구성해야 합니다."
        },
        {
          id: "go-api-react",
          label: "Go API + React",
          detail: "성능과 단순한 배포를 우선해 Go 백엔드를 사용합니다.",
          productRequirement: "구현은 Go 백엔드를 src/server 내부의 cmd/server와 internal 구조로 구성하고 React 프론트엔드를 src/ui 아래에 둬야 합니다."
        },
        {
          id: "rust-api-react",
          label: "Rust API + React",
          detail: "비동기 안정성과 타입 안전성을 강하게 가져갑니다.",
          productRequirement: "구현은 Rust 백엔드를 src/server 아래에 두고 tokio 기반 비동기 처리를 고려하며 React 프론트엔드를 src/ui 아래에 둬야 합니다."
        },
        {
          id: "backend-first",
          label: "백엔드 우선",
          detail: "화면보다 API, 데이터 모델, 실행 흐름을 먼저 만듭니다.",
          productRequirement: "구현은 백엔드 중심으로 진행하고 scaffold된 api, core, integrations, services, models, config, common 책임을 명확히 분리해야 합니다."
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
        productRequirement: "Use TypeScript as the default implementation language, place frontend code under src/ui/src, and place backend code under src/server/src for a full-stack application."
      },
      {
        id: "python-fastapi-react",
        label: "Python FastAPI + React",
        detail: "Use a Python API backend with a React frontend.",
        productRequirement: "Place the Python FastAPI backend under src/server and the React frontend under src/ui for a full-stack application."
      },
      {
        id: "go-api-react",
        label: "Go API + React",
        detail: "Prioritize simple deployment and backend performance with Go.",
        productRequirement: "Place the Go backend under src/server with cmd/server and internal packages, and place the React frontend under src/ui."
      },
      {
        id: "rust-api-react",
        label: "Rust API + React",
        detail: "Prioritize async reliability and type safety with Rust.",
        productRequirement: "Place the Rust backend under src/server, consider tokio for async work, and place the React frontend under src/ui."
      },
      {
        id: "backend-first",
        label: "Backend first",
        detail: "Prioritize APIs, data models, and execution flow over screens.",
        productRequirement: "Implement the product as a backend-first system and organize the scaffolded backend layout into clear api, core, integrations, services, models, config, and common responsibilities."
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
    ].slice(0, 12)
  };
}
