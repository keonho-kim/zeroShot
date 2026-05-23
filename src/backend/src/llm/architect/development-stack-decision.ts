import type { ArchitectDecisionResponse } from "@backend/services/architect-service";
import { textByLocale } from "@backend/i18n/locale";

function hasDevelopmentLanguageInfo(goal: string): boolean {
  return /\b(type\s*script|javascript|node\.?js|bun|deno|react|vue|svelte|next\.?js|python|fastapi|django|flask|go|golang|rust|java|kotlin|swift|\.net|php|ruby|rails|zig|elixir|phoenix|scala|spring|express|nestjs)\b/i.test(goal)
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
  return /\b(language|stack|framework|frontend|backend|typescript|javascript|python|node|react|go|golang|rust|java|ruby|zig)\b/i.test(text)
    || /(개발\s*언어|기술\s*스택|프레임워크|프론트|백엔드)/i.test(text);
}

function buildDevelopmentLanguageDecision(locale: string): ArchitectDecisionResponse["decisions"][number] {
  return {
    id: "development-stack",
    title: textByLocale(locale, {
      ko: "개발 언어와 스택",
      en: "Development language and stack",
      zh: "开发语言与技术栈",
      ja: "開発言語とスタック",
      es: "Lenguaje y stack de desarrollo",
      de: "Entwicklungssprache und Stack"
    }),
    prompt: textByLocale(locale, {
      ko: "첫 구현에 사용할 개발 언어와 애플리케이션 구성을 선택하세요.",
      en: "Choose the development language and application shape for the first implementation.",
      zh: "请选择首次实现要使用的开发语言和应用结构。",
      ja: "最初の実装で使う開発言語とアプリ構成を選んでください。",
      es: "Elige el lenguaje de desarrollo y la forma de la aplicación para la primera implementación.",
      de: "Wähle die Entwicklungssprache und die App-Struktur für die erste Umsetzung."
    }),
    section: textByLocale(locale, {
      ko: "개발 언어",
      en: "Development language",
      zh: "开发语言",
      ja: "開発言語",
      es: "Lenguaje de desarrollo",
      de: "Entwicklungssprache"
    }),
    options: [
      {
        id: "typescript-fullstack",
        label: textByLocale(locale, {
          ko: "TypeScript 풀스택",
          en: "TypeScript full stack",
          zh: "TypeScript 全栈",
          ja: "TypeScript フルスタック",
          es: "Full stack con TypeScript",
          de: "TypeScript Full Stack"
        }),
        detail: textByLocale(locale, {
          ko: "프론트엔드와 백엔드를 모두 TypeScript로 구성합니다.",
          en: "Use TypeScript for both frontend and backend.",
          zh: "前端和后端都使用 TypeScript。",
          ja: "フロントエンドとバックエンドの両方に TypeScript を使います。",
          es: "Usa TypeScript tanto en el frontend como en el backend.",
          de: "Nutze TypeScript für Frontend und Backend."
        }),
        productRequirement: "Use TypeScript as the default implementation language, place frontend code under src/ui/src, and place backend code under src/server/src for a full-stack application. Bootstrap: --type fullstack --server-language typescript --ui-language typescript --profile standard."
      },
      {
        id: "python-fastapi-react",
        label: "Python FastAPI + React",
        detail: textByLocale(locale, {
          ko: "백엔드는 Python API, 프론트엔드는 React로 구성합니다.",
          en: "Use a Python API backend with a React frontend.",
          zh: "后端使用 Python API，前端使用 React。",
          ja: "バックエンドは Python API、フロントエンドは React で構成します。",
          es: "Usa un backend API en Python con un frontend en React.",
          de: "Nutze ein Python-API-Backend mit einem React-Frontend."
        }),
        productRequirement: "Place the Python FastAPI backend under src/server and the React frontend under src/ui for a full-stack application. Bootstrap: --type fullstack --server-language python --ui-language typescript --profile standard."
      },
      {
        id: "go-api-react",
        label: "Go API + React",
        detail: textByLocale(locale, {
          ko: "성능과 단순한 배포를 우선해 Go 백엔드를 사용합니다.",
          en: "Prioritize simple deployment and backend performance with Go.",
          zh: "用 Go 优先保证后端性能和简单部署。",
          ja: "Go でシンプルなデプロイとバックエンド性能を重視します。",
          es: "Prioriza un despliegue sencillo y buen rendimiento de backend con Go.",
          de: "Setze mit Go auf einfache Bereitstellung und Backend-Performance."
        }),
        productRequirement: "Place the Go backend under src/server with cmd/server and internal packages, and place the React frontend under src/ui. Bootstrap: --type fullstack --server-language go --ui-language typescript --profile standard."
      },
      {
        id: "rust-api-react",
        label: "Rust API + React",
        detail: textByLocale(locale, {
          ko: "비동기 안정성과 타입 안전성을 강하게 가져갑니다.",
          en: "Prioritize async reliability and type safety with Rust.",
          zh: "用 Rust 强化异步可靠性和类型安全。",
          ja: "Rust で非同期処理の信頼性と型安全性を重視します。",
          es: "Prioriza la fiabilidad asíncrona y la seguridad de tipos con Rust.",
          de: "Setze mit Rust auf asynchrone Zuverlässigkeit und Typsicherheit."
        }),
        productRequirement: "Place the Rust backend under src/server, consider tokio for async work, and place the React frontend under src/ui. Bootstrap: --type fullstack --server-language rust --ui-language typescript --profile standard."
      },
      {
        id: "backend-first",
        label: textByLocale(locale, {
          ko: "백엔드 우선",
          en: "Backend first",
          zh: "后端优先",
          ja: "バックエンド優先",
          es: "Backend primero",
          de: "Backend zuerst"
        }),
        detail: textByLocale(locale, {
          ko: "화면보다 API, 데이터 모델, 실행 흐름을 먼저 만듭니다.",
          en: "Prioritize APIs, data models, and execution flow over screens.",
          zh: "先做好 API、数据模型和执行流程，再处理界面。",
          ja: "画面より先に API、データモデル、実行フローを整えます。",
          es: "Prioriza APIs, modelos de datos y flujos de ejecución antes que las pantallas.",
          de: "Priorisiere APIs, Datenmodelle und Abläufe vor den Oberflächen."
        }),
        productRequirement: "Implement the product as a backend-first system and organize the scaffolded backend layout into clear api, core, integrations, services, models, config, and common responsibilities. Bootstrap: --type backend --language typescript --profile standard."
      }
    ]
  };
}

function developmentOverviewEndIndex(decisions: ArchitectDecisionResponse["decisions"]): number {
  const firstNonOverview = decisions.findIndex((decision) => !/(overview|concept|개요|컨셉|방향|workflow|audience)/i.test(decision.section));
  if (firstNonOverview > 0) {
    return firstNonOverview;
  }
  return Math.min(decisions.length, 2);
}

export function ensureDevelopmentLanguageDecision(response: ArchitectDecisionResponse, goal: string, locale: string): ArchitectDecisionResponse {
  if (hasDevelopmentLanguageInfo(goal) || response.decisions.some(isDevelopmentLanguageDecision)) {
    return response;
  }

  const languageDecision = buildDevelopmentLanguageDecision(locale);
  const insertIndex = developmentOverviewEndIndex(response.decisions);
  return {
    ...response,
    decisions: [
      ...response.decisions.slice(0, insertIndex),
      languageDecision,
      ...response.decisions.slice(insertIndex).filter((decision) => decision.id !== languageDecision.id)
    ].slice(0, 7)
  };
}
