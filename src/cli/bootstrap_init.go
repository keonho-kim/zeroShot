package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type bootstrapCommandSpec struct {
	cwd     string
	command string
	args    []string
}

type bootstrapInitPlan struct {
	setup    string
	commands []bootstrapCommandSpec
}

type toolResolver func(name string) bool

const (
	initSetupExisting     = "existing"
	initSetupPythonNative = "python-native"
	initSetupMaven        = "maven"
	initSetupRuby         = "ruby"
)

func defaultToolResolver(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

func runLanguageInit(target bootstrapTarget, flags *bootstrapFlagSet) error {
	plan, err := buildLanguageInitPlan(target, flags, defaultToolResolver)
	if err != nil {
		return err
	}
	if plan.setup == initSetupExisting {
		fmt.Println("[bootstrap] init: existing project marker found, skipping init")
		return nil
	}
	switch plan.setup {
	case initSetupPythonNative:
		fmt.Println("[bootstrap] init: uv not found, using native python")
		if err := writeNativePythonProject(target, flags.python, false); err != nil {
			return err
		}
	case initSetupMaven:
		fmt.Println("[bootstrap] init: gradle not found, creating Maven boilerplate")
		if err := writeMavenProject(target, javaPackageName(target.module, target.name), false); err != nil {
			return err
		}
	case initSetupRuby:
		if err := writeRubyProject(target, false); err != nil {
			return err
		}
	}
	return runBootstrapCommands(plan.commands)
}

func buildLanguageInitPlan(target bootstrapTarget, flags *bootstrapFlagSet, hasTool toolResolver) (bootstrapInitPlan, error) {
	if hasProjectMarker(target.root, target.language) {
		return bootstrapInitPlan{setup: initSetupExisting}, nil
	}

	switch target.language {
	case "python":
		return buildPythonInitPlan(target, flags.python, hasTool)
	case "typescript", "javascript":
		return buildJavaScriptInitPlan(target, hasTool)
	case "go":
		if !hasTool("go") {
			return bootstrapInitPlan{}, fmt.Errorf("go was not found in PATH")
		}
		return bootstrapInitPlan{commands: []bootstrapCommandSpec{{cwd: target.root, command: "go", args: []string{"mod", "init", target.module}}}}, nil
	case "rust":
		if !hasTool("cargo") {
			return bootstrapInitPlan{}, fmt.Errorf("cargo was not found in PATH")
		}
		args := []string{"init", "--bin", "."}
		if target.projectType == "library" {
			args = []string{"init", "--lib", "."}
		}
		return bootstrapInitPlan{commands: []bootstrapCommandSpec{{cwd: target.root, command: "cargo", args: args}}}, nil
	case "java":
		return buildJavaInitPlan(target, hasTool)
	case "ruby":
		if !hasAnyTool(hasTool, "gem", "ruby") {
			return bootstrapInitPlan{}, fmt.Errorf("neither gem nor ruby was found in PATH")
		}
		return bootstrapInitPlan{setup: initSetupRuby}, nil
	case "zig":
		if !hasTool("zig") {
			return bootstrapInitPlan{}, fmt.Errorf("zig was not found in PATH")
		}
		return bootstrapInitPlan{commands: []bootstrapCommandSpec{{cwd: target.root, command: "zig", args: []string{"init"}}}}, nil
	default:
		return bootstrapInitPlan{}, fmt.Errorf("unsupported language: %s", target.language)
	}
}

func buildPythonInitPlan(target bootstrapTarget, pythonVersion string, hasTool toolResolver) (bootstrapInitPlan, error) {
	if hasTool("uv") {
		args := []string{"init", "--name", target.name, "--python", pythonVersion, "--vcs", "none"}
		switch target.projectType {
		case "library":
			args = append(args, "--lib")
		case "script":
			args = append(args, "--app")
		default:
			args = append(args, "--package")
		}
		args = append(args, target.root)
		return bootstrapInitPlan{commands: []bootstrapCommandSpec{{command: "uv", args: args}}}, nil
	}

	python := firstAvailableToolByResolver(hasTool, "python3", "python")
	if python == "" {
		return bootstrapInitPlan{}, fmt.Errorf("neither uv nor python was found in PATH")
	}
	return bootstrapInitPlan{
		setup: initSetupPythonNative,
		commands: []bootstrapCommandSpec{{
			cwd:     target.root,
			command: python,
			args:    []string{"-m", "venv", ".venv"},
		}},
	}, nil
}

func buildJavaScriptInitPlan(target bootstrapTarget, hasTool toolResolver) (bootstrapInitPlan, error) {
	if hasTool("bun") {
		return bootstrapInitPlan{commands: []bootstrapCommandSpec{{cwd: target.root, command: "bun", args: []string{"init", "-y"}}}}, nil
	}
	if hasTool("npm") {
		fmt.Println("[bootstrap] init: bun not found, using npm")
		return bootstrapInitPlan{commands: []bootstrapCommandSpec{{cwd: target.root, command: "npm", args: []string{"init", "-y"}}}}, nil
	}
	return bootstrapInitPlan{}, fmt.Errorf("neither bun nor npm was found in PATH")
}

func buildJavaInitPlan(target bootstrapTarget, hasTool toolResolver) (bootstrapInitPlan, error) {
	javaPackage := javaPackageName(target.module, target.name)
	if hasTool("gradle") {
		return bootstrapInitPlan{commands: []bootstrapCommandSpec{{
			cwd:     target.root,
			command: "gradle",
			args:    []string{"init", "--type", "java-application", "--dsl", "groovy", "--test-framework", "junit-jupiter", "--project-name", target.name, "--package", javaPackage},
		}}}, nil
	}
	if hasTool("mvn") {
		return bootstrapInitPlan{setup: initSetupMaven}, nil
	}
	return bootstrapInitPlan{}, fmt.Errorf("neither gradle nor maven was found in PATH")
}

func runBootstrapCommands(commands []bootstrapCommandSpec) error {
	for _, command := range commands {
		if err := runTool(command.cwd, command.command, command.args...); err != nil {
			return err
		}
	}
	return nil
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
	commands, err := buildDependencyCommandSpecs(target, flags, defaultToolResolver)
	if err != nil {
		return err
	}
	return runBootstrapCommands(commands)
}

func buildDependencyCommandSpecs(target bootstrapTarget, flags *bootstrapFlagSet, hasTool toolResolver) ([]bootstrapCommandSpec, error) {
	switch target.language {
	case "python":
		return buildPythonDependencyCommands(target, flags, hasTool), nil
	case "typescript", "javascript":
		return buildJavaScriptDependencyCommands(target, hasTool)
	case "rust":
		if !hasTool("cargo") {
			return nil, fmt.Errorf("cargo was not found in PATH")
		}
		return []bootstrapCommandSpec{
			{cwd: target.root, command: "cargo", args: []string{"add", "tokio", "--features", "full"}},
			{cwd: target.root, command: "cargo", args: []string{"add", "serde", "serde_json", "thiserror", "tracing", "tracing-subscriber"}},
		}, nil
	default:
		return nil, nil
	}
}

func buildPythonDependencyCommands(target bootstrapTarget, flags *bootstrapFlagSet, hasTool toolResolver) []bootstrapCommandSpec {
	if hasTool("uv") {
		commands := []bootstrapCommandSpec{{
			cwd:     target.root,
			command: "uv",
			args:    append([]string{"add", "--dev"}, pythonDevDependencies()...),
		}}
		if flags.profile == "llm" {
			commands = append(commands, bootstrapCommandSpec{
				cwd:     target.root,
				command: "uv",
				args:    append([]string{"add"}, pythonLLMDependencies()...),
			})
		}
		return commands
	}

	python := venvPythonPath(target.root)
	if !pathExists(python) {
		return nil
	}
	args := append([]string{"-m", "pip", "install"}, pythonDevDependencies()...)
	if flags.profile == "llm" {
		args = append(args, pythonLLMDependencies()...)
	}
	return []bootstrapCommandSpec{{cwd: target.root, command: python, args: args}}
}

func buildJavaScriptDependencyCommands(target bootstrapTarget, hasTool toolResolver) ([]bootstrapCommandSpec, error) {
	if hasTool("bun") {
		if target.role == "ui" {
			return []bootstrapCommandSpec{
				{cwd: target.root, command: "bun", args: append([]string{"add"}, frontendDependencies()...)},
				{cwd: target.root, command: "bun", args: append([]string{"add", "-d"}, frontendDevDependencies()...)},
			}, nil
		}
		return []bootstrapCommandSpec{{cwd: target.root, command: "bun", args: []string{"add", "zod", "@sentry/node"}}}, nil
	}
	if hasTool("npm") {
		if target.role == "ui" {
			return []bootstrapCommandSpec{
				{cwd: target.root, command: "npm", args: append([]string{"install"}, frontendDependencies()...)},
				{cwd: target.root, command: "npm", args: append([]string{"install", "-D"}, frontendDevDependencies()...)},
			}, nil
		}
		return []bootstrapCommandSpec{{cwd: target.root, command: "npm", args: []string{"install", "zod", "@sentry/node"}}}, nil
	}
	return nil, fmt.Errorf("neither bun nor npm was found in PATH")
}

func hasAnyTool(hasTool toolResolver, names ...string) bool {
	return firstAvailableToolByResolver(hasTool, names...) != ""
}

func firstAvailableToolByResolver(hasTool toolResolver, names ...string) string {
	for _, name := range names {
		if hasTool(name) {
			return name
		}
	}
	return ""
}

func venvPythonPath(root string) string {
	if runtime.GOOS == "windows" {
		return filepath.Join(root, ".venv", "Scripts", "python.exe")
	}
	return filepath.Join(root, ".venv", "bin", "python")
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
