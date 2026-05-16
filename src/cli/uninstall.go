package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var packageNames = []string{"@keonhokim/zeroshot", "@zeroshot/cli"}

type uninstallPlan struct {
	binPaths     []string
	packageRoots []string
	dataRoots    []string
	scopeDirs    []string
}

func runUninstall(dryRun bool) error {
	plan := createUninstallPlan()
	printUninstallPlan(plan)
	if dryRun {
		fmt.Println("[zeroshot] dry run only; no files were removed")
		return nil
	}

	scriptDir, err := os.MkdirTemp("", "zeroshot-uninstall-")
	if err != nil {
		return err
	}
	scriptPath := filepath.Join(scriptDir, "cleanup.sh")
	if err := os.WriteFile(scriptPath, []byte(buildCleanupScript(plan)), 0o700); err != nil {
		return err
	}

	command := exec.Command("sh", scriptPath)
	if err := command.Start(); err != nil {
		return err
	}

	fmt.Println("[zeroshot] uninstall scheduled")
	fmt.Println("[zeroshot] restart your shell or run `hash -r` if your shell still caches the old command path.")
	return nil
}

func createUninstallPlan() uninstallPlan {
	packageRoots := existingPaths(packageRootCandidates())
	binPaths := existingPaths(binPathCandidates(packageRoots))
	dataRoots := existingPaths(dataRootCandidates())
	scopeDirs := uniquePaths(parentDirs(packageRoots))

	return uninstallPlan{
		binPaths:     binPaths,
		packageRoots: packageRoots,
		dataRoots:    dataRoots,
		scopeDirs:    scopeDirs,
	}
}

func packageRootCandidates() []string {
	var candidates []string
	packageRoot := resolvePackageRoot()
	workspaceRoot := resolveWorkspaceRoot()
	if packageRoot != "" && (workspaceRoot == "" || !isWithin(packageRoot, workspaceRoot)) {
		candidates = append(candidates, packageRoot)
	}

	if npmRoot := commandOutput("npm", "root", "-g"); npmRoot != "" {
		for _, name := range packageNames {
			candidates = append(candidates, filepath.Join(append([]string{npmRoot}, strings.Split(name, "/")...)...))
		}
	}

	if bunBin := commandOutput("bun", "pm", "bin", "-g"); bunBin != "" {
		bunRoot := filepath.Join(bunBin, "..", "install", "global", "node_modules")
		for _, name := range packageNames {
			candidates = append(candidates, filepath.Join(append([]string{bunRoot}, strings.Split(name, "/")...)...))
		}
	}

	home, err := os.UserHomeDir()
	if err == nil {
		bunInstall := os.Getenv("BUN_INSTALL")
		if bunInstall == "" {
			bunInstall = filepath.Join(home, ".bun")
		}
		bunGlobalRoot := filepath.Join(bunInstall, "install", "global", "node_modules")
		for _, name := range packageNames {
			candidates = append(candidates, filepath.Join(append([]string{bunGlobalRoot}, strings.Split(name, "/")...)...))
		}
	}

	return candidates
}

func binPathCandidates(packageRoots []string) []string {
	var candidates []string
	for _, entry := range filepath.SplitList(os.Getenv("PATH")) {
		if entry != "" {
			candidates = append(candidates, filepath.Join(entry, "zeroshot"))
		}
	}

	if npmPrefix := commandOutput("npm", "prefix", "-g"); npmPrefix != "" {
		candidates = append(candidates, filepath.Join(npmPrefix, "bin", "zeroshot"))
	}
	if bunBin := commandOutput("bun", "pm", "bin", "-g"); bunBin != "" {
		candidates = append(candidates, filepath.Join(bunBin, "zeroshot"))
	}

	var filtered []string
	for _, candidate := range candidates {
		if isZeroShotBin(candidate, packageRoots) {
			filtered = append(filtered, candidate)
		}
	}
	return filtered
}

func dataRootCandidates() []string {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	candidates := []string{filepath.Join(home, ".zeroshot")}
	if dataRoot := os.Getenv("ZEROSHOT_DATA_ROOT"); dataRoot != "" {
		candidates = append(candidates, dataRoot)
	}
	if configPath := os.Getenv("ZEROSHOT_APP_CONFIG"); configPath != "" {
		candidates = append(candidates, filepath.Dir(configPath))
	}

	var safe []string
	for _, candidate := range candidates {
		if filepath.Base(resolvePath(candidate)) == ".zeroshot" {
			safe = append(safe, candidate)
		}
	}
	return safe
}

func isZeroShotBin(path string, packageRoots []string) bool {
	if len(packageRoots) == 0 || !pathExists(path) {
		return false
	}

	realPath := path
	if resolved, err := filepath.EvalSymlinks(path); err == nil {
		realPath = resolved
	}

	for _, root := range packageRoots {
		if isWithin(realPath, root) {
			return true
		}
	}
	return false
}

func commandOutput(name string, args ...string) string {
	command := exec.Command(name, args...)
	output, err := command.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(output))
}

func printUninstallPlan(plan uninstallPlan) {
	fmt.Println("[zeroshot] uninstall targets")
	for _, path := range plan.binPaths {
		fmt.Printf("  bin     %s\n", path)
	}
	for _, path := range plan.packageRoots {
		fmt.Printf("  package %s\n", path)
	}
	for _, path := range plan.dataRoots {
		fmt.Printf("  data    %s\n", path)
	}
	if len(plan.binPaths)+len(plan.packageRoots)+len(plan.dataRoots) == 0 {
		fmt.Println("  none")
	}
}

func buildCleanupScript(plan uninstallPlan) string {
	var lines []string
	lines = append(lines,
		"#!/usr/bin/env sh",
		"set -u",
		"sleep 1",
		"if command -v npm >/dev/null 2>&1; then",
		"  npm uninstall -g @keonhokim/zeroshot @zeroshot/cli >/dev/null 2>&1 || true",
		"fi",
		"if command -v bun >/dev/null 2>&1; then",
		"  bun remove -g @keonhokim/zeroshot @zeroshot/cli >/dev/null 2>&1 || true",
		"fi",
	)
	for _, path := range plan.binPaths {
		lines = append(lines, "rm -f "+shellQuote(path))
	}
	for _, path := range append(plan.packageRoots, plan.dataRoots...) {
		lines = append(lines, "rm -rf "+shellQuote(path))
	}
	for _, path := range plan.scopeDirs {
		lines = append(lines, "rmdir "+shellQuote(path)+" 2>/dev/null || true")
	}
	lines = append(lines,
		"hash -r 2>/dev/null || true",
		"echo \"[zeroshot] uninstall complete\"",
		"rm -f \"$0\"",
		"",
	)
	return strings.Join(lines, "\n")
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'"
}

func existingPaths(paths []string) []string {
	var existing []string
	for _, path := range uniquePaths(paths) {
		if pathExists(path) {
			existing = append(existing, path)
		}
	}
	return existing
}

func uniquePaths(paths []string) []string {
	seen := map[string]bool{}
	var unique []string
	for _, path := range paths {
		if path == "" {
			continue
		}
		resolved := resolvePath(path)
		if !seen[resolved] {
			seen[resolved] = true
			unique = append(unique, resolved)
		}
	}
	return unique
}

func parentDirs(paths []string) []string {
	var parents []string
	for _, path := range paths {
		parents = append(parents, filepath.Dir(path))
	}
	return parents
}
