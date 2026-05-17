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
	if !pathExists(filepath.Join(projectRoot, "ARCHITECT", "PRODUCT.html")) {
		if err := writeFileIfMissing(filepath.Join(projectRoot, "ARCHITECT", "PRODUCT.html"), productPlaceholderHTML(), flags.force); err != nil {
			return err
		}
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

- ` + "`api`" + `: HTTP routes, controllers, or external interface boundaries.
- ` + "`core`" + `: product rules, use cases, and domain logic.
- ` + "`services`" + `: application orchestration.
- ` + "`integrations`" + `: databases, external APIs, queues, storage, auth providers, and agent protocols.
- ` + "`models`" + `: domain models, DTOs, schemas, and validation objects.
- ` + "`config`" + `: runtime configuration.
- ` + "`common`" + `: small shared utilities only.

## Backend Architecture

- Preserve the scaffolded backend folders while organizing growing behavior by product domain.
- Keep route/controller files thin; they should validate transport input and delegate to domain-oriented services or core use cases.
- Put domain invariants, state transitions, and product rules in focused modules under ` + "`core`" + ` or a domain-specific service boundary.
- Keep database, external API, queue, storage, auth, and agent protocol details under ` + "`integrations`" + `.
- Use ` + "`common`" + ` only for small domain-neutral utilities. Do not turn it into a dumping ground for product behavior.
- Split files when one file owns unrelated domains, transport handling, validation, orchestration, and infrastructure at the same time.
- Prefer functions and explicit data structures. Use classes only when lifecycle, identity, or encapsulated mutable state is needed now.

## Frontend Layout

- ` + "`pages`" + `: route-level screens.
- ` + "`components`" + `: reusable UI components.
- ` + "`hooks`" + `: reusable React hooks.
- ` + "`stores`" + `: client state.
- ` + "`types`" + `: shared frontend types.
- ` + "`common`" + `: UI-neutral utilities.
- ` + "`lib`" + `: API clients and framework helpers.

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

- ARCHITECT/PRODUCT.html is the only canonical product blueprint.
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

- Backend projects should keep the scaffolded layout while maintaining domain-level ownership.
- Routes and controllers should stay thin and delegate to domain-oriented services or core use cases.
- Domain rules, validation, state transitions, and application decisions should live outside transport handlers.
- Integrations should isolate databases, external APIs, queues, storage, auth providers, and agent protocols.
- Common utilities must remain small, generic, and domain-neutral.
- During updates, inspect touched backend areas for oversized files, duplicated utilities, weak domain boundaries, and architecture drift.
`
}

func productPlaceholderHTML() string {
	return "<!doctype html>\n<html lang=\"en\">\n<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>PRODUCT</title></head>\n<body><main><h1>PRODUCT Blueprint</h1><p>Run ARCHITECT to replace this placeholder with the canonical product blueprint.</p></main></body>\n</html>\n"
}
