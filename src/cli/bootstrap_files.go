package main

import (
	"os"
	"path/filepath"
)

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
