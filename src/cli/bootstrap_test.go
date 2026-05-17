package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestBootstrapCreatesFullstackScaffoldWithoutInit(t *testing.T) {
	root := t.TempDir()
	flags := &bootstrapFlagSet{
		projectRoot:    root,
		projectType:    "fullstack",
		serverLanguage: "typescript",
		uiLanguage:     "typescript",
		name:           "mini-mani-mo",
		skipInit:       true,
	}

	if err := runBootstrap(flags); err != nil {
		t.Fatal(err)
	}

	assertPathExists(t, filepath.Join(root, "src", "server", "src", "api"))
	assertPathExists(t, filepath.Join(root, "src", "server", "src", "core"))
	assertPathExists(t, filepath.Join(root, "src", "server", "src", "integrations"))
	assertPathExists(t, filepath.Join(root, "src", "ui", "src", "pages"))
	assertPathExists(t, filepath.Join(root, "src", "ui", "src", "components"))
	assertPathExists(t, filepath.Join(root, "src", "ui", "src", "stores"))
	assertPathExists(t, filepath.Join(root, "AGENTS.md"))
	assertPathExists(t, filepath.Join(root, ".agents", "PROJECT_CONTEXT.md"))
	assertPathMissing(t, filepath.Join(root, "ARCHITECT", "PRODUCT.html"))
	assertPathExists(t, filepath.Join(root, "DESIGN"))
	assertPathMissing(t, filepath.Join(root, "src", "server", "package.json"))
	assertPathMissing(t, filepath.Join(root, "src", "ui", "package.json"))

	agents, err := os.ReadFile(filepath.Join(root, "AGENTS.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(agents), "Backend Architecture") {
		t.Fatal("expected AGENTS.md to include backend architecture guidance")
	}
	context, err := os.ReadFile(filepath.Join(root, ".agents", "PROJECT_CONTEXT.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(context), "domain-level ownership") {
		t.Fatal("expected PROJECT_CONTEXT.md to include domain-level backend guidance")
	}
	assertPathExists(t, filepath.Join(root, ".agents", "skills"))
	assertPathExists(t, filepath.Join(root, ".agents", "assets", "skills"))
}

func TestBootstrapCreatesPythonScaffoldWithoutPackageMetadataWhenInitIsSkipped(t *testing.T) {
	root := t.TempDir()
	flags := &bootstrapFlagSet{
		projectRoot: root,
		projectType: "backend",
		language:    "python",
		name:        "mini-mani-mo",
		skipInit:    true,
	}

	if err := runBootstrap(flags); err != nil {
		t.Fatal(err)
	}

	packageRoot := filepath.Join(root, "src", "mini_mani_mo")
	assertPathMissing(t, filepath.Join(root, "pyproject.toml"))
	assertPathMissing(t, filepath.Join(root, ".python-version"))
	assertPathExists(t, filepath.Join(packageRoot, "api", "__init__.py"))
	assertPathExists(t, filepath.Join(packageRoot, "core", "__init__.py"))
	assertPathExists(t, filepath.Join(packageRoot, "common", "__init__.py"))
	assertPathExists(t, filepath.Join(packageRoot, "integrations", "__init__.py"))
}

func TestBootstrapRejectsUnsupportedFrontendLanguage(t *testing.T) {
	flags := &bootstrapFlagSet{
		projectRoot: t.TempDir(),
		projectType: "frontend",
		language:    "python",
	}

	if err := runBootstrap(flags); err == nil {
		t.Fatal("expected unsupported frontend language error")
	}
}

func TestLanguageInitCommandSpecs(t *testing.T) {
	root := t.TempDir()
	tests := []struct {
		name        string
		target      bootstrapTarget
		flags       bootstrapFlagSet
		tools       []string
		setup       string
		command     string
		argsContain []string
	}{
		{
			name:        "python uv package",
			target:      bootstrapTarget{language: "python", projectType: "backend", root: root, name: "mini-mani-mo", module: "mini_mani_mo"},
			flags:       bootstrapFlagSet{python: "3.14"},
			tools:       []string{"uv"},
			command:     "uv",
			argsContain: []string{"init", "--name", "mini-mani-mo", "--python", "3.14", "--vcs", "none", "--package", root},
		},
		{
			name:        "python native fallback",
			target:      bootstrapTarget{language: "python", projectType: "script", root: root, name: "mini-mani-mo", module: "mini_mani_mo"},
			flags:       bootstrapFlagSet{python: "3.14"},
			tools:       []string{"python3"},
			setup:       initSetupPythonNative,
			command:     "python3",
			argsContain: []string{"-m", "venv", ".venv"},
		},
		{
			name:        "typescript bun",
			target:      bootstrapTarget{language: "typescript", projectType: "frontend", root: root, name: "mini-mani-mo"},
			tools:       []string{"bun"},
			command:     "bun",
			argsContain: []string{"init", "-y"},
		},
		{
			name:        "javascript npm fallback",
			target:      bootstrapTarget{language: "javascript", projectType: "frontend", root: root, name: "mini-mani-mo"},
			tools:       []string{"npm"},
			command:     "npm",
			argsContain: []string{"init", "-y"},
		},
		{
			name:        "go",
			target:      bootstrapTarget{language: "go", projectType: "backend", root: root, name: "mini-mani-mo", module: "example.com/mini"},
			tools:       []string{"go"},
			command:     "go",
			argsContain: []string{"mod", "init", "example.com/mini"},
		},
		{
			name:        "rust library",
			target:      bootstrapTarget{language: "rust", projectType: "library", root: root, name: "mini-mani-mo"},
			tools:       []string{"cargo"},
			command:     "cargo",
			argsContain: []string{"init", "--lib", "."},
		},
		{
			name:        "java gradle",
			target:      bootstrapTarget{language: "java", projectType: "backend", root: root, name: "mini-mani-mo", module: "com.example.mini"},
			tools:       []string{"gradle"},
			command:     "gradle",
			argsContain: []string{"init", "--type", "java-application"},
		},
		{
			name:   "java maven fallback",
			target: bootstrapTarget{language: "java", projectType: "backend", root: root, name: "mini-mani-mo", module: "com.example.mini"},
			tools:  []string{"mvn"},
			setup:  initSetupMaven,
		},
		{
			name:   "ruby gemspec",
			target: bootstrapTarget{language: "ruby", projectType: "backend", root: root, name: "mini-mani-mo"},
			tools:  []string{"gem"},
			setup:  initSetupRuby,
		},
		{
			name:        "zig",
			target:      bootstrapTarget{language: "zig", projectType: "backend", root: root, name: "mini-mani-mo"},
			tools:       []string{"zig"},
			command:     "zig",
			argsContain: []string{"init"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flags := tt.flags
			plan, err := buildLanguageInitPlan(tt.target, &flags, fakeToolResolver(tt.tools...))
			if err != nil {
				t.Fatal(err)
			}
			if plan.setup != tt.setup {
				t.Fatalf("expected setup %q, got %q", tt.setup, plan.setup)
			}
			if tt.command == "" {
				if len(plan.commands) != 0 {
					t.Fatalf("expected no commands, got %#v", plan.commands)
				}
				return
			}
			if len(plan.commands) != 1 {
				t.Fatalf("expected one command, got %#v", plan.commands)
			}
			command := plan.commands[0]
			if command.command != tt.command {
				t.Fatalf("expected command %q, got %q", tt.command, command.command)
			}
			for _, expected := range tt.argsContain {
				if !contains(command.args, expected) {
					t.Fatalf("expected args %#v to contain %q", command.args, expected)
				}
			}
		})
	}
}

func TestLanguageInitFailsWhenRequiredToolchainIsMissing(t *testing.T) {
	targets := []bootstrapTarget{
		{language: "go", root: t.TempDir(), name: "mini-mani-mo", module: "example.com/mini"},
		{language: "rust", root: t.TempDir(), name: "mini-mani-mo"},
		{language: "zig", root: t.TempDir(), name: "mini-mani-mo"},
	}

	for _, target := range targets {
		flags := &bootstrapFlagSet{python: "3.14"}
		if _, err := buildLanguageInitPlan(target, flags, fakeToolResolver()); err == nil {
			t.Fatalf("expected missing toolchain error for %s", target.language)
		}
	}
}

func TestDependencyCommandSpecs(t *testing.T) {
	root := t.TempDir()

	pythonCommands, err := buildDependencyCommandSpecs(
		bootstrapTarget{language: "python", root: root},
		&bootstrapFlagSet{profile: "llm"},
		fakeToolResolver("uv"),
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(pythonCommands) != 2 || pythonCommands[0].command != "uv" || !contains(pythonCommands[0].args, "ruff") || !contains(pythonCommands[1].args, "langgraph") {
		t.Fatalf("unexpected python dependency commands: %#v", pythonCommands)
	}

	uiCommands, err := buildDependencyCommandSpecs(
		bootstrapTarget{language: "typescript", role: "ui", root: root},
		&bootstrapFlagSet{},
		fakeToolResolver("bun"),
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(uiCommands) != 2 || uiCommands[0].command != "bun" || !contains(uiCommands[0].args, "react") || !contains(uiCommands[1].args, "typescript") {
		t.Fatalf("unexpected UI dependency commands: %#v", uiCommands)
	}

	backendCommands, err := buildDependencyCommandSpecs(
		bootstrapTarget{language: "javascript", role: "server", root: root},
		&bootstrapFlagSet{},
		fakeToolResolver("npm"),
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(backendCommands) != 1 || backendCommands[0].command != "npm" || !contains(backendCommands[0].args, "@sentry/node") {
		t.Fatalf("unexpected backend dependency commands: %#v", backendCommands)
	}

	rustCommands, err := buildDependencyCommandSpecs(
		bootstrapTarget{language: "rust", root: root},
		&bootstrapFlagSet{},
		fakeToolResolver("cargo"),
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(rustCommands) != 2 || rustCommands[0].command != "cargo" || !contains(rustCommands[0].args, "tokio") || !contains(rustCommands[1].args, "tracing") {
		t.Fatalf("unexpected rust dependency commands: %#v", rustCommands)
	}
}

func fakeToolResolver(names ...string) toolResolver {
	available := map[string]bool{}
	for _, name := range names {
		available[name] = true
	}
	return func(name string) bool {
		return available[name]
	}
}

func contains(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func assertPathExists(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("expected path to exist: %s: %v", path, err)
	}
}

func assertPathMissing(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); err == nil {
		t.Fatalf("expected path to be absent: %s", path)
	}
}
