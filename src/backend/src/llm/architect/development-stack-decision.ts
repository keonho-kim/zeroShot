import type { ArchitectDecisionResponse } from "@backend/services/architect/service";
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

function backendRequirement(language: string, constDir: "const" | "constants"): string {
  return `Use the scaffolded backend structure with app, routes, services, integrations, core, config, and types. Place domain behavior under services/<domain>/${constDir}, focused part files, and service as the public assembly point. Bootstrap: --type backend --language ${language} --profile standard.`;
}

function fullstackRequirement(serverLanguage: string, constDir: "const" | "constants"): string {
  return `Place backend code under src/server and frontend code under src/ui. Backend domains use services/<domain>/${constDir}, focused part files, and service as the public assembly point. Frontend uses app, pages, widgets, features, entities, shared, lib/api, hooks, store, and styles. Bootstrap: --type fullstack --server-language ${serverLanguage} --ui-language typescript --profile standard.`;
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
        productRequirement: fullstackRequirement("typescript", "const")
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
        productRequirement: fullstackRequirement("python", "const")
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
        productRequirement: fullstackRequirement("go", "constants")
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
        productRequirement: fullstackRequirement("rust", "constants")
      },
      {
        id: "backend-service",
        label: textByLocale(locale, {
          ko: "백엔드 서비스",
          en: "Backend service",
          zh: "后端服务",
          ja: "バックエンドサービス",
          es: "Servicio backend",
          de: "Backend-Service"
        }),
        detail: textByLocale(locale, {
          ko: "API, 데이터 모델, 실행 흐름 중심의 백엔드 애플리케이션을 만듭니다.",
          en: "Build a backend application centered on APIs, data models, and execution flow.",
          zh: "构建以 API、数据模型和执行流程为中心的后端应用。",
          ja: "API、データモデル、実行フローを中心にしたバックエンドアプリを作ります。",
          es: "Crea una aplicación backend centrada en APIs, modelos de datos y flujo de ejecución.",
          de: "Erstelle eine Backend-Anwendung mit Fokus auf APIs, Datenmodelle und Abläufe."
        }),
        productRequirement: backendRequirement("typescript", "const")
      },
      {
        id: "frontend-app",
        label: textByLocale(locale, {
          ko: "프론트엔드 앱",
          en: "Frontend app",
          zh: "前端应用",
          ja: "フロントエンドアプリ",
          es: "Aplicación frontend",
          de: "Frontend-App"
        }),
        detail: textByLocale(locale, {
          ko: "라우트 화면, 기능, 엔티티, API 클라이언트를 분리한 React 앱을 만듭니다.",
          en: "Build a React app with separated pages, features, entities, and API clients.",
          zh: "构建分离页面、功能、实体和 API 客户端的 React 应用。",
          ja: "ページ、機能、エンティティ、API クライアントを分けた React アプリを作ります。",
          es: "Crea una app React con páginas, features, entidades y clientes API separados.",
          de: "Erstelle eine React-App mit getrennten Pages, Features, Entities und API-Clients."
        }),
        productRequirement: "Use the scaffolded frontend structure with app, pages, widgets, features, entities, shared, lib/api, hooks, store, and styles. Keep page components thin and move state/event orchestration into page controllers or features. Bootstrap: --type frontend --language typescript --profile standard."
      },
      {
        id: "library-package",
        label: textByLocale(locale, {
          ko: "라이브러리 패키지",
          en: "Library package",
          zh: "库包",
          ja: "ライブラリパッケージ",
          es: "Paquete de biblioteca",
          de: "Bibliothekspaket"
        }),
        detail: textByLocale(locale, {
          ko: "재사용 가능한 모듈과 명확한 public API를 우선합니다.",
          en: "Prioritize reusable modules and a clear public API.",
          zh: "优先构建可复用模块和清晰的公共 API。",
          ja: "再利用可能なモジュールと明確な public API を重視します。",
          es: "Prioriza módulos reutilizables y una API pública clara.",
          de: "Priorisiere wiederverwendbare Module und eine klare öffentliche API."
        }),
        productRequirement: "Build a library package with a small public API, focused domain modules, explicit types, and no app-specific transport layer unless required. Bootstrap: --type library --language typescript --profile standard."
      },
      {
        id: "script-tool",
        label: textByLocale(locale, {
          ko: "스크립트/CLI 도구",
          en: "Script or CLI tool",
          zh: "脚本或 CLI 工具",
          ja: "スクリプトまたは CLI ツール",
          es: "Script o herramienta CLI",
          de: "Skript oder CLI-Tool"
        }),
        detail: textByLocale(locale, {
          ko: "작은 실행 흐름, 명확한 입력/출력, 테스트 가능한 순수 로직을 우선합니다.",
          en: "Prioritize a small execution flow, clear input/output, and testable plain logic.",
          zh: "优先考虑小型执行流程、清晰输入输出和可测试的纯逻辑。",
          ja: "小さな実行フロー、明確な入出力、テスト可能な純粋ロジックを重視します。",
          es: "Prioriza un flujo pequeño, entrada/salida clara y lógica pura comprobable.",
          de: "Priorisiere einen kleinen Ablauf, klare Ein-/Ausgabe und testbare reine Logik."
        }),
        productRequirement: "Build a script or CLI project with a small entry point, focused reusable modules, explicit input/output handling, and testable plain logic. Bootstrap: --type script --language python --profile standard."
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
