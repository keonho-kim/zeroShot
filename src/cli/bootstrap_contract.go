package main

import (
	"path/filepath"
	"strings"
)

func writeProjectContract(projectRoot string, plan []bootstrapTarget, flags *bootstrapFlagSet) error {
	if err := ensureDir(filepath.Join(projectRoot, ".agents", "skills")); err != nil {
		return err
	}
	if err := ensureDir(filepath.Join(projectRoot, ".agents", "assets")); err != nil {
		return err
	}
	if err := ensureDir(filepath.Join(projectRoot, "ARCHITECT")); err != nil {
		return err
	}
	if err := ensureDir(filepath.Join(projectRoot, "DESIGN")); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(projectRoot, "AGENTS.md"), buildGeneratedAgentsMarkdown(plan, flags), flags.force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(projectRoot, ".agents", "PROJECT_CONTEXT.md"), buildProjectContextMarkdown(plan, flags), flags.force); err != nil {
		return err
	}
	return nil
}

func buildGeneratedAgentsMarkdown(plan []bootstrapTarget, flags *bootstrapFlagSet) string {
	return `# Project Agent Guide

## Product Source

- Use ` + "`ARCHITECT/PRODUCT.html`" + ` as the canonical product blueprint.
- Do not create or depend on ` + "`PRODUCT.md`" + `.
- Use ` + "`DESIGN/index.html`" + ` as the visual and interaction design artifact when present.
- Use ` + "`.agents/PROJECT_CONTEXT.md`" + ` as the project overview that ZeroShot includes in Codex task requests.
- Keep user-facing Build and Update reports under ` + "`runs/`" + `.

## Source Layout

- Keep full-stack server code under ` + "`src/server`" + ` and frontend code under ` + "`src/ui`" + `.
- Keep backend-only code in the scaffolded backend layout.
- Do not create parallel ` + "`backend/`" + `, ` + "`frontend/`" + `, ` + "`client/`" + `, or ` + "`app/`" + ` roots unless the project already uses them.

## Backend Layout

- ` + "`app`" + `: application startup and top-level wiring.
- ` + "`routes`" + `: HTTP routes, controllers, request/response handling, or external interface boundaries.
- ` + "`services/<domain>/{const|constants,...,service}`" + `: domain use cases and orchestration. The service file is the public assembly point for that domain.
- ` + "`integrations`" + `: databases, external APIs, queues, storage, auth providers, and agent protocols.
- ` + "`core`" + `: domain-neutral execution rules, guards, and shared product logic.
- ` + "`config`" + `: runtime configuration.
- ` + "`types`" + `: shared backend types, DTOs, schemas, and validation objects.

## Backend Architecture

- Preserve the scaffolded backend folders while organizing growing behavior by product domain.
- Keep route/controller files thin; they should validate transport input and delegate to domain-oriented services or core use cases.
- Put domain invariants, state transitions, and product rules in focused modules under ` + "`services/<domain>`" + ` or ` + "`core`" + `.
- Keep database, external API, queue, storage, auth, and agent protocol details under ` + "`integrations`" + `.
- Use ` + "`const`" + ` for TypeScript, JavaScript, and Python service constants. Use ` + "`constants`" + ` for Go, Rust, Java, Ruby, and Zig.
- Split files when one file owns unrelated domains, transport handling, validation, orchestration, and infrastructure at the same time.
- Prefer functions and explicit data structures. Use classes only when lifecycle, identity, or encapsulated mutable state is needed now.

## Frontend Layout

- ` + "`app`" + `: application bootstrap, providers, router, and layout wiring.
- ` + "`pages`" + `: route-level screens.
- ` + "`widgets`" + `: reusable composed UI blocks.
- ` + "`features`" + `: user-action units such as submit, save, upload, search, or checkout.
- ` + "`entities`" + `: domain models, plain state rules, and UI-independent validation.
- ` + "`shared`" + `: reusable UI and utilities that are truly domain-neutral.
- ` + "`lib/api`" + `: backend API clients and route constants by domain.
- ` + "`hooks`" + `: reusable React hooks.
- ` + "`store`" + `: cross-cutting client state.
- ` + "`styles`" + `: page, component, or domain CSS split by responsibility.

## Working Rules

- Inspect the existing files before adding structure.
- Use the initialized package manager and framework.
- Install current package versions through the package manager instead of pinning stale versions.
- Make the smallest coherent product-level change.
- Run the relevant validation command before reporting completion.
- Keep failures explicit and do not silently degrade behavior.
`
}

func buildProjectContextMarkdown(plan []bootstrapTarget, flags *bootstrapFlagSet) string {
	targetLines := make([]string, 0, len(plan))
	for _, target := range plan {
		targetLines = append(targetLines, "- "+target.role+": "+target.language+" "+target.projectType+" at "+target.root)
	}
	return `# ZeroShot Project Context

This file is included as request context for ZeroShot Architect, Design, Build, and Update sessions. It is separate from AGENTS.md.

## Bootstrap Targets

` + strings.Join(targetLines, "\n") + `

## Canonical Product Artifact

- ARCHITECT/PRODUCT.html is generated by the ARCHITECT session after the product questions are complete.
- ARCHITECT/PRODUCT.html is the only canonical product blueprint once it exists.
- PRODUCT.md should not be generated or used as a source of truth.
- DESIGN/index.html is the canonical interactive design artifact after the DESIGN MAKEOVER session.

## Architect Conversation Rounds

Architect should run enough question rounds to remove ambiguity before generating implementation decisions:

1. Development overview: product goal, target users, language/runtime preference, deployment target, data sensitivity, and package manager constraints.
2. Product detail: core workflows, screens, entities, permissions, integrations, and expected edge cases.
3. Development detail: framework choices, persistence, background jobs, realtime/SSE needs, auth, testing, validation commands, and extra libraries.

The exact questions may vary. Architect can ask as many questions as needed when a choice affects implementation quality.

## Dependency Guidance

- Python dev dependencies: ruff, ty, pytest, pytest-asyncio.
- Python web candidates: FastAPI, Django, Starlette, Litestar.
- Python LLM candidates: LangChain, LangGraph, DeepAgents, langchain-mcp-adapters, FastMCP, a2a-sdk, SSE support.
- Rust backend candidates: tokio, axum, serde, thiserror, tracing.
- Frontend baseline: React, Vite, TypeScript, Radix Slot, Floating UI, TanStack Query, Lexical, Framer Motion, Sentry, Zustand, Tailwind utilities.
- Frontend review candidates: Tiptap for rich editing and Ant Design for enterprise-heavy component surfaces.

Always install package-manager-resolved latest versions unless the user or framework requires a specific version.

## Backend Architecture Guidance

- Backend projects should keep the scaffolded app, routes, services, integrations, core, config, and types layout while maintaining domain-level ownership.
- Routes and controllers should stay thin and delegate to domain-oriented services or core use cases.
- Domain rules, validation, state transitions, and application decisions should live outside transport handlers.
- Integrations should isolate databases, external APIs, queues, storage, auth providers, and agent protocols.
- Constants should live under service domain const folders for TypeScript, JavaScript, and Python, and constants folders for Go, Rust, Java, Ruby, and Zig.
- During updates, inspect touched backend areas for oversized files, duplicated utilities, weak domain boundaries, and architecture drift.

## Frontend Architecture Guidance

- Frontend projects should keep the scaffolded app, pages, widgets, features, entities, shared, lib/api, hooks, store, and styles layout.
- Pages should assemble rendering and delegate state, mutation, and event orchestration to page controllers, features, entities, or hooks.
- API calls should live in lib/api/<domain>, not directly in page components.
- Domain logic that can be tested without rendering belongs in entities/<domain>.
`
}
