package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/spf13/cobra"
)

type bootstrapFlagSet struct {
	projectRoot    string
	projectType    string
	language       string
	serverLanguage string
	uiLanguage     string
	name           string
	module         string
	python         string
	profile        string
	dryRun         bool
	skipInit       bool
	force          bool
}

type bootstrapTarget struct {
	role        string
	projectType string
	language    string
	root        string
	name        string
	module      string
}

var supportedBackendLanguages = map[string]bool{
	"python":     true,
	"typescript": true,
	"javascript": true,
	"go":         true,
	"rust":       true,
	"java":       true,
	"ruby":       true,
	"zig":        true,
}

var supportedUiLanguages = map[string]bool{
	"typescript": true,
	"javascript": true,
}

func newBootstrapCommand() *cobra.Command {
	flags := &bootstrapFlagSet{
		projectType:    "backend",
		language:       "typescript",
		serverLanguage: "typescript",
		uiLanguage:     "typescript",
		python:         "3.14",
		profile:        "standard",
	}
	cmd := &cobra.Command{
		Use:   "bootstrap",
		Short: "Create language-aware project bootstrap files and standard boilerplate",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runBootstrap(flags)
		},
	}

	cmd.Flags().StringVar(&flags.projectRoot, "project-root", "", "Path to the target project root")
	cmd.Flags().StringVar(&flags.projectType, "type", flags.projectType, "Project type: backend, frontend, fullstack, library, or script")
	cmd.Flags().StringVar(&flags.language, "language", flags.language, "Language for backend, frontend, library, or script projects")
	cmd.Flags().StringVar(&flags.serverLanguage, "server-language", flags.serverLanguage, "Server language for fullstack projects")
	cmd.Flags().StringVar(&flags.uiLanguage, "ui-language", flags.uiLanguage, "UI language for fullstack or frontend projects")
	cmd.Flags().StringVar(&flags.name, "name", "", "Project/package name. Defaults to the project directory name")
	cmd.Flags().StringVar(&flags.module, "module", "", "Module path or package namespace for Go, Java, Python, and Ruby")
	cmd.Flags().StringVar(&flags.python, "python", flags.python, "Python minor version for uv or native Python bootstrap")
	cmd.Flags().StringVar(&flags.profile, "profile", flags.profile, "Dependency profile: standard or llm")
	cmd.Flags().BoolVar(&flags.dryRun, "dry-run", false, "Print planned actions without changing files")
	cmd.Flags().BoolVar(&flags.skipInit, "skip-init", false, "Create ZeroShot boilerplate without running language init commands")
	cmd.Flags().BoolVar(&flags.force, "force", false, "Overwrite ZeroShot boilerplate files when they already exist")
	_ = cmd.MarkFlagRequired("project-root")
	return cmd
}

func runBootstrap(flags *bootstrapFlagSet) error {
	plan, err := buildBootstrapPlan(flags)
	if err != nil {
		return err
	}

	if !flags.dryRun {
		if err := os.MkdirAll(resolvePath(flags.projectRoot), 0o755); err != nil {
			return err
		}
	}

	for _, target := range plan {
		if err := bootstrapTargetProject(target, flags); err != nil {
			return err
		}
	}
	if !flags.dryRun {
		if err := writeProjectContract(resolvePath(flags.projectRoot), plan, flags); err != nil {
			return err
		}
		if err := copyBundledSkills(resolvePath(flags.projectRoot)); err != nil {
			return err
		}
	}
	return nil
}

func buildBootstrapPlan(flags *bootstrapFlagSet) ([]bootstrapTarget, error) {
	projectType := strings.ToLower(flags.projectType)
	if projectType == "" {
		projectType = "backend"
	}
	root := resolvePath(flags.projectRoot)
	if root == "" {
		return nil, fmt.Errorf("--project-root is required")
	}
	name := packageName(flags.name)
	if name == "" {
		name = packageName(filepath.Base(root))
	}
	if name == "" {
		return nil, fmt.Errorf("could not derive a project name from %s", root)
	}

	switch projectType {
	case "backend", "library", "script":
		language := normalizeLanguage(flags.language)
		if !supportedBackendLanguages[language] {
			return nil, fmt.Errorf("unsupported %s language: %s", projectType, flags.language)
		}
		return []bootstrapTarget{{
			role:        "server",
			projectType: projectType,
			language:    language,
			root:        root,
			name:        name,
			module:      moduleName(flags.module, language, name),
		}}, nil
	case "frontend":
		language := normalizeLanguage(flags.language)
		if !supportedUiLanguages[language] {
			return nil, fmt.Errorf("unsupported frontend language: %s", language)
		}
		return []bootstrapTarget{{
			role:        "ui",
			projectType: projectType,
			language:    language,
			root:        root,
			name:        name,
			module:      name,
		}}, nil
	case "fullstack":
		serverLanguage := normalizeLanguage(flags.serverLanguage)
		uiLanguage := normalizeLanguage(flags.uiLanguage)
		serverName := name + "-server"
		uiName := name + "-ui"
		if !supportedBackendLanguages[serverLanguage] {
			return nil, fmt.Errorf("unsupported server language: %s", flags.serverLanguage)
		}
		if !supportedUiLanguages[uiLanguage] {
			return nil, fmt.Errorf("unsupported UI language: %s", flags.uiLanguage)
		}
		return []bootstrapTarget{
			{
				role:        "server",
				projectType: "backend",
				language:    serverLanguage,
				root:        filepath.Join(root, "src", "server"),
				name:        serverName,
				module:      moduleName(flags.module, serverLanguage, serverName),
			},
			{
				role:        "ui",
				projectType: "frontend",
				language:    uiLanguage,
				root:        filepath.Join(root, "src", "ui"),
				name:        uiName,
				module:      uiName,
			},
		}, nil
	default:
		return nil, fmt.Errorf("unsupported project type: %s", flags.projectType)
	}
}

func bootstrapTargetProject(target bootstrapTarget, flags *bootstrapFlagSet) error {
	fmt.Printf("[bootstrap] target: %s %s at %s\n", target.language, target.projectType, target.root)
	if flags.dryRun {
		fmt.Printf("[bootstrap] dry-run: scaffold %s\n", target.root)
		return nil
	}
	if err := os.MkdirAll(target.root, 0o755); err != nil {
		return err
	}
	if !flags.skipInit {
		if err := runLanguageInit(target, flags); err != nil {
			return err
		}
		if err := installBootstrapDependencies(target, flags); err != nil {
			return err
		}
	} else {
		fmt.Println("[bootstrap] init: skipped by --skip-init")
	}
	return applyStandardScaffold(target, flags.force, flags.python)
}

func runLanguageInit(target bootstrapTarget, flags *bootstrapFlagSet) error {
	if hasProjectMarker(target.root, target.language) {
		fmt.Println("[bootstrap] init: existing project marker found, skipping init")
		return nil
	}

	switch target.language {
	case "python":
		return initPython(target, flags.python)
	case "typescript", "javascript":
		return initJavaScript(target)
	case "go":
		return runTool(target.root, "go", "mod", "init", target.module)
	case "rust":
		if target.projectType == "library" {
			return runTool(target.root, "cargo", "init", "--lib", ".")
		}
		return runTool(target.root, "cargo", "init", "--bin", ".")
	case "java":
		return initJava(target)
	case "ruby":
		return initRuby(target)
	case "zig":
		return runTool(target.root, "zig", "init")
	default:
		return fmt.Errorf("unsupported language: %s", target.language)
	}
}

func initPython(target bootstrapTarget, pythonVersion string) error {
	if _, err := exec.LookPath("uv"); err == nil {
		args := []string{"init", "--name", target.name, "--python", pythonVersion, "--vcs", "none"}
		if target.projectType == "library" {
			args = append(args, "--lib")
		} else if target.projectType == "script" {
			args = append(args, "--app")
		} else {
			args = append(args, "--package")
		}
		args = append(args, target.root)
		return runTool("", "uv", args...)
	}

	python := firstAvailableTool("python3", "python")
	if python == "" {
		return fmt.Errorf("neither uv nor python was found in PATH")
	}
	fmt.Println("[bootstrap] init: uv not found, using native python")
	if err := writeNativePythonProject(target, pythonVersion, false); err != nil {
		return err
	}
	return runTool(target.root, python, "-m", "venv", ".venv")
}

func initJavaScript(target bootstrapTarget) error {
	if _, err := exec.LookPath("bun"); err == nil {
		return runTool(target.root, "bun", "init", "-y")
	}
	if _, err := exec.LookPath("npm"); err == nil {
		fmt.Println("[bootstrap] init: bun not found, using npm")
		return runTool(target.root, "npm", "init", "-y")
	}
	return fmt.Errorf("neither bun nor npm was found in PATH")
}

func initJava(target bootstrapTarget) error {
	javaPackage := javaPackageName(target.module, target.name)
	if _, err := exec.LookPath("gradle"); err == nil {
		return runTool(target.root, "gradle", "init", "--type", "java-application", "--dsl", "groovy", "--test-framework", "junit-jupiter", "--project-name", target.name, "--package", javaPackage)
	}
	if _, err := exec.LookPath("mvn"); err == nil {
		fmt.Println("[bootstrap] init: gradle not found, creating Maven boilerplate")
		return writeMavenProject(target, javaPackage, false)
	}
	return fmt.Errorf("neither gradle nor maven was found in PATH")
}

func initRuby(target bootstrapTarget) error {
	if firstAvailableTool("gem", "ruby") == "" {
		return fmt.Errorf("neither gem nor ruby was found in PATH")
	}
	return writeRubyProject(target, false)
}

func applyStandardScaffold(target bootstrapTarget, force bool, pythonVersion string) error {
	switch target.role {
	case "ui":
		return scaffoldFrontend(target, force)
	default:
		return scaffoldBackend(target, force, pythonVersion)
	}
}

func scaffoldFrontend(target bootstrapTarget, force bool) error {
	extension := "ts"
	if target.language == "javascript" {
		extension = "js"
	}
	sourceRoot := filepath.Join(target.root, "src")
	for _, dir := range []string{"app", "pages", "components", "hooks", "stores", "types", "common", "lib"} {
		if err := ensureDir(filepath.Join(sourceRoot, dir)); err != nil {
			return err
		}
	}
	if err := writeFrontendPackageJSON(target, force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(sourceRoot, "app", "main."+extension), "export function main() {\n  return null;\n}\n", force)
}

func scaffoldBackend(target bootstrapTarget, force bool, pythonVersion string) error {
	switch target.language {
	case "python":
		return scaffoldPython(target, force, pythonVersion)
	case "typescript", "javascript":
		return scaffoldTypeScriptBackend(target, force)
	case "go":
		return scaffoldGo(target, force)
	case "rust":
		return scaffoldRust(target, force)
	case "java":
		return scaffoldJava(target, force)
	case "ruby":
		if err := writeRubyProject(target, force); err != nil {
			return err
		}
		return scaffoldRuby(target, force)
	case "zig":
		return scaffoldZig(target, force)
	default:
		return fmt.Errorf("unsupported backend language: %s", target.language)
	}
}

func scaffoldPython(target bootstrapTarget, force bool, pythonVersion string) error {
	module := pythonModuleName(target.module)
	if module == "" {
		module = pythonModuleName(target.name)
	}
	packageRoot := filepath.Join(target.root, "src", module)
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(packageRoot, dir)); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(packageRoot, dir, "__init__.py"), "", force); err != nil {
			return err
		}
	}
	if !pathExists(filepath.Join(target.root, "pyproject.toml")) {
		if err := writeNativePythonProject(target, pythonVersion, force); err != nil {
			return err
		}
	}
	return writeFileIfMissing(filepath.Join(packageRoot, "__init__.py"), "def main() -> None:\n    print(\"Hello from "+target.name+"!\")\n", force)
}

func scaffoldTypeScriptBackend(target bootstrapTarget, force bool) error {
	extension := "ts"
	if target.language == "javascript" {
		extension = "js"
	}
	sourceRoot := filepath.Join(target.root, "src")
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(sourceRoot, dir)); err != nil {
			return err
		}
	}
	return writeFileIfMissing(filepath.Join(sourceRoot, "main."+extension), "export function main() {\n  console.log(\"Hello from "+target.name+"!\");\n}\n\nmain();\n", force)
}

func scaffoldGo(target bootstrapTarget, force bool) error {
	for _, dir := range []string{"cmd/server", "internal/api", "internal/core", "internal/common", "internal/integrations", "internal/services", "internal/models", "internal/config"} {
		if err := ensureDir(filepath.Join(target.root, dir)); err != nil {
			return err
		}
	}
	content := "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"Hello from " + target.name + "!\")\n}\n"
	return writeFileIfMissing(filepath.Join(target.root, "cmd", "server", "main.go"), content, force)
}

func scaffoldRust(target bootstrapTarget, force bool) error {
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(target.root, "src", dir)); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(target.root, "src", dir, "mod.rs"), "", force); err != nil {
			return err
		}
	}
	return nil
}

func scaffoldJava(target bootstrapTarget, force bool) error {
	javaPackage := javaPackageName(target.module, target.name)
	base := filepath.Join(append([]string{target.root, "src", "main", "java"}, strings.Split(javaPackage, ".")...)...)
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(base, dir)); err != nil {
			return err
		}
	}
	if pathExists(filepath.Join(target.root, "build.gradle")) || pathExists(filepath.Join(target.root, "build.gradle.kts")) {
		return nil
	}
	return writeMavenProject(target, javaPackage, force)
}

func scaffoldRuby(target bootstrapTarget, force bool) error {
	module := rubyFileName(target.name)
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(target.root, "lib", module, dir)); err != nil {
			return err
		}
	}
	return nil
}

func scaffoldZig(target bootstrapTarget, force bool) error {
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(target.root, "src", dir)); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(target.root, "src", dir, ".gitkeep"), "", force); err != nil {
			return err
		}
	}
	return nil
}

func writeNativePythonProject(target bootstrapTarget, pythonVersion string, force bool) error {
	module := pythonModuleName(target.module)
	if module == "" {
		module = pythonModuleName(target.name)
	}
	content := "[project]\nname = \"" + target.name + "\"\nversion = \"0.1.0\"\ndescription = \"Add your description here\"\nreadme = \"README.md\"\nrequires-python = \">=" + pythonVersion + "\"\ndependencies = []\n\n[project.scripts]\n" + target.name + " = \"" + module + ":main\"\n\n[dependency-groups]\ndev = [\"ruff\", \"ty\", \"pytest\", \"pytest-asyncio\"]\n\n[build-system]\nrequires = [\"setuptools>=69\"]\nbuild-backend = \"setuptools.build_meta\"\n"
	if target.projectType == "script" {
		content = "[project]\nname = \"" + target.name + "\"\nversion = \"0.1.0\"\ndescription = \"Add your description here\"\nreadme = \"README.md\"\nrequires-python = \">=" + pythonVersion + "\"\ndependencies = []\n\n[dependency-groups]\ndev = [\"ruff\", \"ty\", \"pytest\", \"pytest-asyncio\"]\n"
	}
	if err := writeFileIfMissing(filepath.Join(target.root, "pyproject.toml"), content, force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(target.root, ".python-version"), pythonVersion+"\n", force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(target.root, "README.md"), "# "+target.name+"\n", force)
}

func writeMavenProject(target bootstrapTarget, javaPackage string, force bool) error {
	pom := "<project xmlns=\"http://maven.apache.org/POM/4.0.0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>" + javaPackage + "</groupId>\n  <artifactId>" + target.name + "</artifactId>\n  <version>0.1.0</version>\n  <properties>\n    <maven.compiler.release>21</maven.compiler.release>\n  </properties>\n</project>\n"
	return writeFileIfMissing(filepath.Join(target.root, "pom.xml"), pom, force)
}

func writeRubyProject(target bootstrapTarget, force bool) error {
	module := rubyFileName(target.name)
	className := rubyModuleName(target.name)
	if err := writeFileIfMissing(filepath.Join(target.root, "Gemfile"), "source \"https://rubygems.org\"\n\ngemspec\n", force); err != nil {
		return err
	}
	gemspec := "Gem::Specification.new do |spec|\n  spec.name = \"" + target.name + "\"\n  spec.version = \"0.1.0\"\n  spec.summary = \"Add your summary here\"\n  spec.files = Dir[\"lib/**/*.rb\"]\n  spec.require_paths = [\"lib\"]\nend\n"
	if err := writeFileIfMissing(filepath.Join(target.root, target.name+".gemspec"), gemspec, force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(target.root, "lib", module+".rb"), "module "+className+"\nend\n", force)
}

func runTool(cwd string, name string, args ...string) error {
	if _, err := exec.LookPath(name); err != nil {
		return fmt.Errorf("%s was not found in PATH", name)
	}
	fmt.Printf("[bootstrap] command: %s %s\n", name, strings.Join(args, " "))
	command := exec.Command(name, args...)
	command.Stdin = os.Stdin
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	if cwd != "" {
		command.Dir = cwd
	}
	return command.Run()
}

func installBootstrapDependencies(target bootstrapTarget, flags *bootstrapFlagSet) error {
	switch target.language {
	case "python":
		if _, err := exec.LookPath("uv"); err == nil {
			if err := runTool(target.root, "uv", append([]string{"add", "--dev"}, pythonDevDependencies()...)...); err != nil {
				return err
			}
			if flags.profile == "llm" {
				if err := runTool(target.root, "uv", append([]string{"add"}, pythonLLMDependencies()...)...); err != nil {
					return err
				}
			}
		}
	case "typescript", "javascript":
		if _, err := exec.LookPath("bun"); err == nil {
			if target.role == "ui" {
				if err := runTool(target.root, "bun", append([]string{"add"}, frontendDependencies()...)...); err != nil {
					return err
				}
				return runTool(target.root, "bun", append([]string{"add", "-d"}, frontendDevDependencies()...)...)
			}
			return runTool(target.root, "bun", "add", "zod", "@sentry/node")
		}
		if _, err := exec.LookPath("npm"); err == nil {
			if target.role == "ui" {
				if err := runTool(target.root, "npm", append([]string{"install"}, frontendDependencies()...)...); err != nil {
					return err
				}
				return runTool(target.root, "npm", append([]string{"install", "-D"}, frontendDevDependencies()...)...)
			}
			return runTool(target.root, "npm", "install", "zod", "@sentry/node")
		}
	case "rust":
		if err := runTool(target.root, "cargo", "add", "tokio", "--features", "full"); err != nil {
			return err
		}
		return runTool(target.root, "cargo", "add", "serde", "serde_json", "thiserror", "tracing", "tracing-subscriber")
	}
	return nil
}

func pythonDevDependencies() []string {
	return []string{"ruff", "ty", "pytest", "pytest-asyncio"}
}

func pythonLLMDependencies() []string {
	return []string{"fastapi", "uvicorn[standard]", "sse-starlette", "langchain", "langgraph", "deepagents", "langchain-mcp-adapters", "fastmcp", "a2a-sdk"}
}

func frontendDependencies() []string {
	return []string{
		"@floating-ui/react",
		"@lexical/code",
		"@lexical/history",
		"@lexical/link",
		"@lexical/list",
		"@lexical/react",
		"@lexical/rich-text",
		"@radix-ui/react-slot",
		"@sentry/react",
		"@tanstack/react-query",
		"axios",
		"class-variance-authority",
		"clsx",
		"framer-motion",
		"lexical",
		"lucide-react",
		"nanoid",
		"react",
		"react-dom",
		"react-router-dom",
		"tailwind-merge",
		"zod",
		"zustand",
	}
}

func frontendDevDependencies() []string {
	return []string{"@tailwindcss/vite", "@types/react", "@types/react-dom", "@vitejs/plugin-react", "tailwindcss", "typescript", "vite"}
}

func writeFrontendPackageJSON(target bootstrapTarget, force bool) error {
	path := filepath.Join(target.root, "package.json")
	if !force && pathExists(path) {
		return nil
	}
	content := `{
  "name": "` + target.name + `",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
`
	return writeFileIfMissing(path, content, force)
}

func writeProjectContract(projectRoot string, plan []bootstrapTarget, flags *bootstrapFlagSet) error {
	if err := ensureDir(filepath.Join(projectRoot, ".agents", "skills")); err != nil {
		return err
	}
	if err := ensureDir(filepath.Join(projectRoot, ".agents", "assets")); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(projectRoot, "AGENTS.md"), buildGeneratedAgentsMarkdown(plan, flags), flags.force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(projectRoot, ".agents", "PROJECT_CONTEXT.md"), buildProjectContextMarkdown(plan, flags), flags.force); err != nil {
		return err
	}
	if !pathExists(filepath.Join(projectRoot, "PRODUCT.html")) {
		if err := writeFileIfMissing(filepath.Join(projectRoot, "PRODUCT.html"), productPlaceholderHTML(), flags.force); err != nil {
			return err
		}
	}
	return writeFileIfMissing(filepath.Join(projectRoot, "DESIGN.md"), "# DESIGN\n\nDesign decisions will be recorded here after the DESIGN session.\n", flags.force)
}

func buildGeneratedAgentsMarkdown(plan []bootstrapTarget, flags *bootstrapFlagSet) string {
	return `# Project Agent Guide

## Product Source

- Use ` + "`PRODUCT.html`" + ` as the canonical product blueprint.
- Do not create or depend on ` + "`PRODUCT.md`" + `.
- Use ` + "`DESIGN.md`" + ` as the visual and interaction design guide when present.
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

- PRODUCT.html is the only canonical product blueprint.
- PRODUCT.md should not be generated or used as a source of truth.
- DESIGN.md records design decisions after the DESIGN session.

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
`
}

func productPlaceholderHTML() string {
	return "<!doctype html>\n<html lang=\"en\">\n<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>PRODUCT</title></head>\n<body><main><h1>PRODUCT Blueprint</h1><p>Run ARCHITECT to replace this placeholder with the canonical product blueprint.</p></main></body>\n</html>\n"
}

func copyBundledSkills(projectRoot string) error {
	workspaceRoot := resolveWorkspaceRoot()
	if workspaceRoot == "" {
		return nil
	}
	sourceRoot := filepath.Join(workspaceRoot, ".agents", "skills")
	if !pathExists(sourceRoot) {
		return nil
	}
	targetRoot := filepath.Join(projectRoot, ".agents", "skills")
	if err := copyDirectory(sourceRoot, targetRoot); err != nil {
		return err
	}
	return copyDirectory(sourceRoot, filepath.Join(projectRoot, ".agents", "assets", "skills"))
}

func copyDirectory(source string, target string) error {
	entries, err := os.ReadDir(source)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(target, 0o755); err != nil {
		return err
	}
	for _, entry := range entries {
		sourcePath := filepath.Join(source, entry.Name())
		targetPath := filepath.Join(target, entry.Name())
		if entry.IsDir() {
			if err := copyDirectory(sourcePath, targetPath); err != nil {
				return err
			}
			continue
		}
		content, err := os.ReadFile(sourcePath)
		if err != nil {
			return err
		}
		if err := os.WriteFile(targetPath, content, 0o644); err != nil {
			return err
		}
	}
	return nil
}

func ensureDir(path string) error {
	return os.MkdirAll(path, 0o755)
}

func writeFileIfMissing(path string, content string, force bool) error {
	if !force && pathExists(path) {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0o644)
}

func hasProjectMarker(root string, language string) bool {
	markers := map[string][]string{
		"python":     {"pyproject.toml"},
		"typescript": {"package.json"},
		"javascript": {"package.json"},
		"go":         {"go.mod"},
		"rust":       {"Cargo.toml"},
		"java":       {"build.gradle", "build.gradle.kts", "pom.xml"},
		"ruby":       {"Gemfile"},
		"zig":        {"build.zig", "build.zig.zon"},
	}
	for _, marker := range markers[language] {
		if pathExists(filepath.Join(root, marker)) {
			return true
		}
	}
	if language == "ruby" {
		matches, _ := filepath.Glob(filepath.Join(root, "*.gemspec"))
		return len(matches) > 0
	}
	return false
}

func normalizeLanguage(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "ts":
		return "typescript"
	case "js":
		return "javascript"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func packageName(value string) string {
	parts := regexp.MustCompile(`[^a-zA-Z0-9]+`).Split(strings.ToLower(value), -1)
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			clean = append(clean, part)
		}
	}
	return strings.Join(clean, "-")
}

func moduleName(value string, language string, fallback string) string {
	if value != "" {
		return value
	}
	switch language {
	case "python":
		return pythonModuleName(fallback)
	case "java":
		return "com.example." + pythonModuleName(fallback)
	default:
		return fallback
	}
}

func pythonModuleName(value string) string {
	clean := regexp.MustCompile(`[^a-zA-Z0-9]+`).ReplaceAllString(strings.ToLower(value), "_")
	clean = strings.Trim(clean, "_")
	if clean == "" {
		return ""
	}
	if clean[0] >= '0' && clean[0] <= '9' {
		return "app_" + clean
	}
	return clean
}

func javaPackageName(module string, fallback string) string {
	value := module
	if value == "" {
		value = "com.example." + pythonModuleName(fallback)
	}
	parts := strings.Split(strings.ToLower(value), ".")
	for index, part := range parts {
		parts[index] = pythonModuleName(part)
	}
	return strings.Join(parts, ".")
}

func rubyFileName(value string) string {
	return pythonModuleName(value)
}

func rubyModuleName(value string) string {
	parts := strings.Split(pythonModuleName(value), "_")
	for index, part := range parts {
		if part == "" {
			continue
		}
		parts[index] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, "")
}

func firstAvailableTool(names ...string) string {
	for _, name := range names {
		if _, err := exec.LookPath(name); err == nil {
			return name
		}
	}
	return ""
}
