package main

import (
	"fmt"
	"os"
	"path/filepath"
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
