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
	assertPathExists(t, filepath.Join(root, "PRODUCT.html"))

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
}

func TestBootstrapCreatesPythonPackageScaffoldWithoutInit(t *testing.T) {
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
	assertPathExists(t, filepath.Join(root, "pyproject.toml"))
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

func assertPathExists(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("expected path to exist: %s: %v", path, err)
	}
}
