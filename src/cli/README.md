# ZeroShot Go CLI

This directory is the new Go CLI boundary for the installable `zeroshot` command.

## Current Command Inventory

The current TypeScript CLI exposes these commands:

| Command | Current responsibility | Go boundary |
| --- | --- | --- |
| `zeroshot build` | Run the Codex build pipeline for a target project. | Keep the pipeline in TypeScript and delegate to it from Go. |
| `zeroshot update` | Run the Codex update pipeline for a target project. | Keep the pipeline in TypeScript and delegate to it from Go. |
| `zeroshot bootstrap` | Create language-aware init files and standard project boilerplate. | Run deterministic toolchain bootstrap and scaffold logic in Go before Codex implementation work. |
| `zeroshot start` | Create or read app config, resolve installed artifacts, and start the web app server. | Move the command shell, config handling, artifact checks, and process launch to Go. |
| `zeroshot uninstall` | Remove global install targets and local ZeroShot app data. | Move filesystem discovery and cleanup orchestration to Go. |
| `zeroshot help` | Render command help. | Provided by Cobra. |

## Library Selection

The Go CLI starts with these libraries:

| Library | Use |
| --- | --- |
| `github.com/spf13/cobra` | Command tree, help rendering, command-specific flags, and argument validation. |
| `github.com/spf13/pflag` | POSIX-style flag parsing through Cobra. |
| `github.com/pelletier/go-toml/v2` | Read and write the existing `~/.zeroshot/config.toml` format. |

## Boundary Rule

Codex-related pipeline execution stays in TypeScript because it depends on the TypeScript Codex SDK and existing phase implementation. The Go CLI should be a compact launcher and system integration layer, not a rewrite of the pipeline runtime.

## Bootstrap Policy

`zeroshot bootstrap` creates deterministic project starting points before Codex implementation work:

- Python prefers `uv`; if `uv` is unavailable, it falls back to native `python` virtualenv and `pyproject.toml` files.
- JavaScript and TypeScript prefer `bun`; if `bun` is unavailable, they fall back to `npm`.
- Go, Rust, and Zig use their native toolchains.
- Java prefers Gradle and uses Maven-style boilerplate when Maven is the available fallback.
- Ruby creates RubyGems-compatible gem boilerplate.
- Python always includes `ruff`, `ty`, `pytest`, and `pytest-asyncio` as development dependencies.
- The `llm` profile adds FastAPI, SSE, LangChain, LangGraph, DeepAgents, MCP adapter, FastMCP, and A2A SDK packages.
- React frontends use the same baseline dependency family as ZeroShot UI, with Tiptap and Ant Design listed for Architect review rather than installed by default.

Full-stack projects use `src/server` and `src/ui`. Backend scaffolds use `app`, `routes`, `services`, `integrations`, `core`, `config`, and `types` areas, adapted to each language's conventions. Backend services include a neutral `services/system` domain with `const` for TypeScript, JavaScript, and Python, and `constants` for Go, Rust, Java, Ruby, and Zig. Frontend scaffolds use `app`, `pages`, `widgets`, `features`, `entities`, `shared`, `lib/api`, `hooks`, `store`, and `styles`.

`--skip-init` skips package manager and toolchain initialization, including dependency installation and package metadata files such as `pyproject.toml`, `package.json`, `Cargo.toml`, and `go.mod`. It still creates the ZeroShot folders and source layout.

Bootstrap also creates `AGENTS.md`, `.agents/PROJECT_CONTEXT.md`, `ARCHITECT/`, `DESIGN/`, and local `.agents/skills` copies. `ARCHITECT/PRODUCT.html` is generated later by the ARCHITECT session after product questions are complete; root `PRODUCT.html`, root `DESIGN.md`, and `PRODUCT.md` are intentionally not generated.
