package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

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
