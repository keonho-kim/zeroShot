import type { PipelineContext } from "@cli/pipeline/types";

export function updateInputFileBlock(ctx: PipelineContext): string {
  if (ctx.mode !== "update") {
    return "";
  }
  return `Update input file to read:
- ${ctx.updateFile}`;
}

export function additionalDirectoryBlock(ctx: PipelineContext): string {
  if (!ctx.options.additionalDirectories.length) {
    return "";
  }
  return `Additional read-only ZeroShot resource roots available to this run:
${ctx.options.additionalDirectories.map((directory) => `- ${directory}`).join("\n")}

Use these roots as guidance for skills, design systems, and design templates when they fit the product. Do not modify files in these resource roots.`;
}

export function compactStateBlock(ctx: PipelineContext): string {
  return `Current compact pipeline state:
${JSON.stringify(ctx.compactState, null, 2)}`;
}

export function workspaceContractBlock(): string {
  return `Workspace output contract:
- Do not create .work.history.
- Do not create or update PLAN.md, DONE.md, REQUIREMENTS.md, SPEC.md, TEST_PLAN.md, CHANGES.md, or FINAL_REPORT.md.
- The runner will create only user-facing HTML reports under runs/<run-name>/.
- Store implementation progress only in the final JSON response fields.`;
}

export function workingMemoryContractBlock(): string {
  return `Working memory contract:
- ARCHITECT/PRODUCT.html is the product planning, requirements, behavior, and acceptance-criteria source of truth.
- DESIGN/index.html is the visual and interaction design source of truth when it exists.
- UPDATE.md is the change request in update mode.
- Use the compact pipeline state above instead of markdown run documents.
- Preserve the PRODUCT and DESIGN direction as much as practical. If implementation constraints require a deviation, record it in open_issues or validation.
- Keep summaries short and concrete.
- Do not generate HTML. The runner renders fixed templates.`;
}

export function bootstrapEnvironmentContractBlock(): string {
  return `Bootstrap language and environment contract:
- Treat .agents/PROJECT_CONTEXT.md as the current project language, framework, runtime, and environment context when it exists.
- Follow the bootstrapped language and environment before choosing new dependencies, commands, or source layout.
- If the project context is missing, infer the environment from existing repository files before adding new tooling.`;
}

export function sourceFileHeaderContractBlock(): string {
  return `Source file documentation contract:
- For every new or substantially modified source file, include a short top-of-file comment that explains the file's purpose and role.
- Keep the comment concrete and useful to a developer reading the file later.
- Do not add a top-of-file comment only when the file syntax or generated-file convention makes comments inappropriate.`;
}

export function backendArchitectureBlock(): string {
  return `Backend architecture guidance:
- Preserve the scaffolded backend folders: app, routes, services, integrations, core, config, and types.
- Organize backend code by product domain from the start when more than one behavior area exists.
- Keep route/controller files in routes thin; they should validate transport input, call a domain service, and return transport output.
- Put domain use cases under services/<domain>/{const|constants,...,service}; service is the public assembly point for that domain.
- Use const for TypeScript, JavaScript, and Python domain constants; use constants for Go, Rust, Java, Ruby, and Zig.
- Keep integrations behind explicit modules for databases, external APIs, queues, storage, auth providers, agent protocols, and other infrastructure.
- Keep core for domain-neutral execution rules, guards, and shared product logic. Keep config and types focused on runtime configuration and shared schemas/DTOs.
- Prefer plain functions and explicit data structures unless identity, lifecycle, or encapsulated mutable state makes a class the clearer model.`;
}

export function frontendArchitectureBlock(): string {
  return `Frontend architecture guidance:
- Preserve the scaffolded frontend folders: app, pages, widgets, features, entities, shared, lib/api, hooks, store, and styles.
- Keep route page components in pages focused on rendering assembly.
- Move page state, mutations, event handling, and view-model composition into page controllers, features, entities, or hooks according to ownership.
- Put backend transport calls in lib/api/<domain> and route constants in lib/api/const.
- Put product models, validation, state transitions, and plain testable UI-independent rules in entities/<domain>.
- Put reusable user actions in features and composed cross-page UI blocks in widgets.
- Keep shared limited to truly domain-neutral UI and utilities.`;
}

export function updateRefactoringGuidanceBlock(): string {
  return `Update-mode refactoring guidance:
- Before changing behavior, inspect whether touched backend files have too many responsibilities, duplicated logic, or utilities trapped inside feature files.
- Apply YAGNI, DRY, single responsibility, and clear module boundary rules while staying scoped to the requested update.
- If a touched source file is over roughly 500 lines, inspect whether transport, domain, integration, or UI responsibilities should be split by domain before adding more behavior.
- Split large files when it makes the update easier to verify or maintain.
- Extract utilities only when there is real repeated behavior or a clear reusable boundary.
- Move shared domain-neutral helpers into core or shared frontend modules; move domain behavior into the relevant services/<domain> or entities/<domain> module.
- Promote functions or data objects to classes only when lifecycle, identity, or encapsulated mutable state is genuinely needed now.
- Prefer a coherent domain-level refactor over layering another special case onto an already overloaded backend file.
- Record any deferred backend refactoring risk in open_issues instead of silently ignoring it.`;
}

export function finalJsonContractBlock(): string {
  return `Final JSON requirements:
- work_log_entries should contain only user-useful work items.
- changed_files should list repo-relative paths that changed.
- validation should list commands/checks and outcomes.
- next_steps should list useful remaining actions.
- open_issues should list real blockers or risks only.
- queue_empty should be true only when no implementation work remains.
- code_changed should be true only when repository files under active development changed.
- product_sync_safe should be true only when PRODUCT.html is safe and coherent after update sync.
- Write user-facing summaries in the response language configured for this run.`;
}

export function commonContractBlock(ctx: PipelineContext): string {
  return [
    "You are running inside Codex CLI in scripted non-interactive mode.",
    "This is a filesystem action task, not an answer-only task.",
    "",
    workspaceContractBlock(),
    "",
    workingMemoryContractBlock(),
    "",
    bootstrapEnvironmentContractBlock(),
    "",
    sourceFileHeaderContractBlock(),
    "",
    backendArchitectureBlock(),
    "",
    frontendArchitectureBlock(),
    ctx.mode === "update" ? `\n${updateRefactoringGuidanceBlock()}` : "",
    "",
    finalJsonContractBlock()
  ].filter(Boolean).join("\n");
}
