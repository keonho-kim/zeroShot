export const standardApplicationArchitecturePrompt = `Standard application architecture:
- This guidance applies to ordinary software products, not only LLM or agent apps.
- Use domain-centered folders with thin input/output layers and explicit assembly points.
- Backend-only projects use the scaffolded backend root. Full-stack projects use src/server for backend code and src/ui for frontend code.
- Frontend-only projects use the scaffolded frontend root.

Backend structure:
- app: application startup and top-level wiring.
- routes: HTTP routes, controllers, request/response handling, or external interface boundaries.
- services/<domain>/{const|constants,...,service}: domain use cases and orchestration. service is the public assembly point for that domain.
- integrations: databases, external APIs, queues, storage, auth providers, and infrastructure clients.
- core: domain-neutral execution rules, guards, and shared product logic that is not transport-specific.
- config: runtime configuration.
- types: shared backend types, DTOs, schemas, and validation objects.
- Keep route/controller files thin. Move product rules, validation, state transitions, and application decisions into domain services or core modules.
- Do not create compatibility wrappers, barrels, or parallel legacy entry points unless the user explicitly asks for them.

Frontend structure:
- app: application bootstrap, providers, router, and layout wiring.
- pages: route-level screens. Page components should assemble rendering and delegate state and events.
- widgets: reusable composed UI blocks that combine entities and features.
- features: user-action units such as submit, save, upload, search, or checkout.
- entities: domain models, plain TypeScript rules, state transitions, and validation that can be tested without rendering.
- shared: reusable UI and utilities that are truly domain-neutral.
- lib/api/<domain>: backend API clients by domain. Keep transport calls out of page components.
- hooks: cross-cutting hooks.
- store: cross-cutting client state.
- styles: page, component, or domain CSS split by responsibility.

Language-specific structure:
- TypeScript and JavaScript backend services use services/<domain>/const for stable constants and services/<domain>/service.ts or service.js for assembly.
- Python backend services use services/<domain>/const and service.py inside the package root.
- Go, Rust, Java, and Zig backend services use services/<domain>/constants because const is a language keyword or poor package name.
- Ruby uses constants for the same scaffold consistency as other non-TS/Python backend languages.
- Prefer package/module naming conventions native to the selected language while preserving the same responsibilities.
- Files over roughly 500 lines should trigger a responsibility check and usually be split by domain, transport, integration, or UI concern.`;

export const bootstrapScaffoldArchitecturePrompt = `Bootstrap scaffold structure:
- Backend scaffold creates app, routes, services, integrations, core, config, and types.
- Backend scaffold creates a neutral services/system domain with a constants folder named const for TypeScript, JavaScript, and Python, and constants for Go, Rust, Java, Ruby, and Zig.
- Frontend scaffold creates app, pages, widgets, features, entities, shared, lib/api, hooks, store, and styles.
- Frontend scaffold creates lib/api/const/routes and lib/api/client as the minimal API boundary.
- Full-stack scaffold creates backend code under src/server and frontend code under src/ui.
- The standard profile uses the same structure as the llm profile. The llm profile only adds LLM-related dependency guidance.`;
