package main

import (
	"os"
	"path/filepath"
	"strings"
)

type pipelineInvocation struct {
	command string
	args    []string
	cwd     string
	entry   string
}

func resolveWorkspaceRoot() string {
	if value := os.Getenv("ZEROSHOT_WORKSPACE_ROOT"); value != "" {
		return resolvePath(value)
	}
	if cwd, err := os.Getwd(); err == nil {
		if root := findWorkspaceRoot(cwd); root != "" {
			return root
		}
	}
	if exe, err := os.Executable(); err == nil {
		if root := findWorkspaceRoot(filepath.Dir(exe)); root != "" {
			return root
		}
	}
	return ""
}

func resolvePackageRoot() string {
	if value := os.Getenv("ZEROSHOT_PACKAGE_ROOT"); value != "" {
		return resolvePath(value)
	}

	if exe, err := os.Executable(); err == nil {
		realExe := exe
		if resolved, resolveErr := filepath.EvalSymlinks(exe); resolveErr == nil {
			realExe = resolved
		}
		if root := findPackageRoot(filepath.Dir(realExe)); root != "" {
			return root
		}
	}

	if workspaceRoot := resolveWorkspaceRoot(); workspaceRoot != "" {
		cliRoot := filepath.Join(workspaceRoot, "cli")
		if pathExists(filepath.Join(cliRoot, "package.json")) {
			return cliRoot
		}
	}
	return ""
}

func findWorkspaceRoot(start string) string {
	current := resolvePath(start)
	for {
		if pathExists(filepath.Join(current, "zeroshot.app.toml")) && pathExists(filepath.Join(current, "package.json")) {
			return current
		}
		parent := filepath.Dir(current)
		if parent == current {
			return ""
		}
		current = parent
	}
}

func findPackageRoot(start string) string {
	current := resolvePath(start)
	for {
		packageJSON := filepath.Join(current, "package.json")
		if pathExists(packageJSON) {
			if current == filepath.Dir(current) || filepath.Base(current) == "cli" || pathExists(filepath.Join(current, "dist")) {
				return current
			}
		}
		parent := filepath.Dir(current)
		if parent == current {
			return ""
		}
		current = parent
	}
}

func resolvePipelineInvocation() (pipelineInvocation, error) {
	packageRoot := resolvePackageRoot()
	if packageRoot != "" {
		packagedEntry := filepath.Join(packageRoot, "dist", "pipeline-cli.js")
		if pathExists(packagedEntry) {
			workspaceRoot := resolveWorkspaceRoot()
			cwd := workspaceRoot
			if cwd == "" {
				cwd = packageRoot
			}
			return pipelineInvocation{
				command: "bun",
				args:    []string{packagedEntry},
				cwd:     cwd,
				entry:   packagedEntry,
			}, nil
		}
	}

	workspaceRoot := resolveWorkspaceRoot()
	if workspaceRoot == "" {
		return pipelineInvocation{}, os.ErrNotExist
	}
	cliRoot := filepath.Join(workspaceRoot, "cli")
	sourceEntry := filepath.Join(cliRoot, "src", "pipeline-cli.ts")
	if !pathExists(sourceEntry) {
		return pipelineInvocation{}, os.ErrNotExist
	}
	return pipelineInvocation{
		command: "bun",
		args:    []string{"run", "--cwd", cliRoot, "src/pipeline-cli.ts"},
		cwd:     workspaceRoot,
		entry:   sourceEntry,
	}, nil
}

func isWithin(child string, parent string) bool {
	child = resolvePath(child)
	parent = resolvePath(parent)
	rel, err := filepath.Rel(parent, child)
	if err != nil {
		return false
	}
	return rel == "." || (!strings.HasPrefix(rel, ".."+string(filepath.Separator)) && rel != "..")
}
