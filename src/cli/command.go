package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"

	"github.com/spf13/cobra"
)

type pipelineFlagSet struct {
	projectRoot       string
	model             string
	approval          string
	sandbox           string
	maxIters          int
	stallLimit        int
	planReasoning     string
	execReasoning     string
	validateReasoning string
	closeoutReasoning string
	addDirs           []string
	responseLanguage  string
}

type startFlagSet struct {
	host string
	port int
}

func newRootCommand() *cobra.Command {
	root := &cobra.Command{
		Use:           "zeroshot",
		Short:         "ZeroShot production CLI wrapper",
		SilenceUsage:  true,
		SilenceErrors: true,
	}
	root.CompletionOptions.DisableDefaultCmd = true

	root.AddCommand(newPipelineCommand("build", "Run the build pipeline"))
	root.AddCommand(newPipelineCommand("update", "Run the update pipeline"))
	root.AddCommand(newBootstrapCommand())
	root.AddCommand(newStartCommand())
	root.AddCommand(newUninstallCommand())
	return root
}

func newPipelineCommand(mode string, description string) *cobra.Command {
	flags := &pipelineFlagSet{}
	cmd := &cobra.Command{
		Use:   mode,
		Short: description,
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := assertDirectory(flags.projectRoot); err != nil {
				return err
			}
			return runPipelineCommand(cmd, mode, flags)
		},
	}

	cmd.Flags().StringVar(&flags.projectRoot, "project-root", "", "Absolute path to the target project root")
	cmd.Flags().StringVar(&flags.model, "model", "", "Override Codex model")
	cmd.Flags().StringVar(&flags.approval, "approval", "", "Approval policy override")
	cmd.Flags().StringVar(&flags.sandbox, "sandbox", "", "Sandbox mode override")
	cmd.Flags().IntVar(&flags.maxIters, "max-iters", 0, "Maximum implementation iterations")
	cmd.Flags().IntVar(&flags.stallLimit, "stall-limit", 0, "Stall threshold before replanning")
	cmd.Flags().StringVar(&flags.planReasoning, "plan-reasoning", "", "Reasoning effort for planning phases")
	cmd.Flags().StringVar(&flags.execReasoning, "exec-reasoning", "", "Reasoning effort for implementation phases")
	cmd.Flags().StringVar(&flags.validateReasoning, "validate-reasoning", "", "Reasoning effort for validation")
	cmd.Flags().StringVar(&flags.closeoutReasoning, "closeout-reasoning", "", "Reasoning effort for closeout")
	cmd.Flags().StringArrayVar(&flags.addDirs, "add-dir", nil, "Additional directory Codex can read during pipeline runs")
	cmd.Flags().StringVar(&flags.responseLanguage, "response-language", "", "Language Codex should use for user-facing run documents and final answers")
	_ = cmd.MarkFlagRequired("project-root")
	return cmd
}

func newStartCommand() *cobra.Command {
	flags := &startFlagSet{}
	cmd := &cobra.Command{
		Use:   "start",
		Short: "Start the ZeroShot web app from installed build artifacts",
		RunE: func(cmd *cobra.Command, args []string) error {
			return startServer(cmd, flags)
		},
	}
	cmd.Flags().StringVar(&flags.host, "host", "", "Host interface to bind. Use 0.0.0.0 for LAN/Tailscale access")
	cmd.Flags().IntVar(&flags.port, "port", 0, "Port to listen on")
	return cmd
}

func newUninstallCommand() *cobra.Command {
	var dryRun bool
	cmd := &cobra.Command{
		Use:   "uninstall",
		Short: "Remove ZeroShot global installs and local ZeroShot app data",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runUninstall(dryRun)
		},
	}
	cmd.Flags().BoolVar(&dryRun, "dry-run", false, "Print uninstall targets without deleting files")
	return cmd
}

func runPipelineCommand(cmd *cobra.Command, mode string, flags *pipelineFlagSet) error {
	invocation, err := resolvePipelineInvocation()
	if err != nil {
		return err
	}

	args := append([]string{}, invocation.args...)
	args = append(args, mode, "--project-root", flags.projectRoot)
	addChangedStringFlag(cmd, &args, "model", flags.model)
	addChangedStringFlag(cmd, &args, "approval", flags.approval)
	addChangedStringFlag(cmd, &args, "sandbox", flags.sandbox)
	addChangedIntFlag(cmd, &args, "max-iters", flags.maxIters)
	addChangedIntFlag(cmd, &args, "stall-limit", flags.stallLimit)
	addChangedStringFlag(cmd, &args, "plan-reasoning", flags.planReasoning)
	addChangedStringFlag(cmd, &args, "exec-reasoning", flags.execReasoning)
	addChangedStringFlag(cmd, &args, "validate-reasoning", flags.validateReasoning)
	addChangedStringFlag(cmd, &args, "closeout-reasoning", flags.closeoutReasoning)
	for _, dir := range flags.addDirs {
		args = append(args, "--add-dir", dir)
	}
	addChangedStringFlag(cmd, &args, "response-language", flags.responseLanguage)

	return runInteractive(invocation.command, args, invocation.cwd, nil)
}

func addChangedStringFlag(cmd *cobra.Command, args *[]string, name string, value string) {
	if cmd.Flags().Changed(name) {
		*args = append(*args, "--"+name, value)
	}
}

func addChangedIntFlag(cmd *cobra.Command, args *[]string, name string, value int) {
	if cmd.Flags().Changed(name) {
		*args = append(*args, "--"+name, strconv.Itoa(value))
	}
}

func runInteractive(name string, args []string, cwd string, env []string) error {
	command := exec.Command(name, args...)
	command.Stdin = os.Stdin
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	if cwd != "" {
		command.Dir = cwd
	}
	if env != nil {
		command.Env = env
	}

	if err := command.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		return err
	}
	return nil
}

func assertDirectory(path string) error {
	if path == "" {
		return fmt.Errorf("Project root does not exist or is not a directory: %s", path)
	}
	info, err := os.Stat(path)
	if err != nil || !info.IsDir() {
		return fmt.Errorf("Project root does not exist or is not a directory: %s", path)
	}
	return nil
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func resolvePath(path string) string {
	absolute, err := filepath.Abs(path)
	if err != nil {
		return path
	}
	return absolute
}
