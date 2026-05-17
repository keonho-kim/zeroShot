package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

func startServer(cmd *cobra.Command, flags *startFlagSet) error {
	configPath, config, err := loadAppConfig()
	if err != nil {
		return err
	}

	host := config.Host
	port := config.Port
	if cmd.Flags().Changed("host") {
		host = flags.host
	}
	if cmd.Flags().Changed("port") {
		port = flags.port
	}

	artifacts, err := resolveStartArtifacts()
	if err != nil {
		return err
	}

	localURL := fmt.Sprintf("http://127.0.0.1:%d", port)
	bindURL := fmt.Sprintf("http://%s:%d", host, port)

	fmt.Println("[zeroshot] starting ZeroShot app")
	fmt.Printf("[zeroshot] config : %s\n", configPath)
	fmt.Printf("[zeroshot] bind   : %s\n", bindURL)
	fmt.Printf("[zeroshot] local  : %s\n", localURL)
	if host == "0.0.0.0" {
		fmt.Printf("[zeroshot] LAN/Tailscale access uses this port: %d\n", port)
		fmt.Printf("[zeroshot] for Tailscale, open http://<tailscale-ip>:%d\n", port)
	} else {
		fmt.Println("[zeroshot] set host = \"0.0.0.0\" in config.toml, or pass --host 0.0.0.0, to accept LAN/Tailscale traffic.")
	}

	env := append(os.Environ(),
		"HOST="+host,
		fmt.Sprintf("PORT=%d", port),
		"ZEROSHOT_APP_CONFIG="+configPath,
		"ZEROSHOT_CLI_ENTRY="+artifacts.pipelineEntry,
		"ZEROSHOT_APP_CLI_ENTRY="+os.Args[0],
		"ZEROSHOT_FRONTEND_DIST="+artifacts.frontendDist,
		"ZEROSHOT_RESOURCE_SOURCE_ROOT="+artifacts.resourceSourceRoot,
	)

	return runInteractive("bun", []string{artifacts.backendEntry}, "", env)
}

type startArtifacts struct {
	backendEntry       string
	frontendDist       string
	pipelineEntry      string
	resourceSourceRoot string
}

func resolveStartArtifacts() (startArtifacts, error) {
	packageRoot := resolvePackageRoot()
	workspaceRoot := resolveWorkspaceRoot()

	var backendEntry string
	var frontendDist string
	var pipelineEntry string
	var resourceSourceRoot string

	if packageRoot != "" {
		packagedBackend := filepath.Join(packageRoot, "app", "backend", "dist", "server.js")
		packagedFrontend := filepath.Join(packageRoot, "app", "frontend", "dist")
		packagedPipeline := filepath.Join(packageRoot, "dist", "pipeline-cli.js")
		packagedResources := filepath.Join(packageRoot, "app", "assets", "design", "source-files")
		if pathExists(packagedBackend) {
			backendEntry = packagedBackend
		}
		if pathExists(packagedFrontend) {
			frontendDist = packagedFrontend
		}
		if pathExists(packagedPipeline) {
			pipelineEntry = packagedPipeline
		}
		if pathExists(packagedResources) {
			resourceSourceRoot = packagedResources
		}
	}

	if workspaceRoot != "" {
		if backendEntry == "" {
			backendEntry = filepath.Join(workspaceRoot, "src", "backend", "src", "server.ts")
		}
		if frontendDist == "" {
			frontendDist = filepath.Join(workspaceRoot, "src", "ui", "dist")
		}
		if pipelineEntry == "" {
			pipelineEntry = filepath.Join(workspaceRoot, "cli", "src", "pipeline-cli.ts")
		}
		if resourceSourceRoot == "" {
			resourceSourceRoot = filepath.Join(workspaceRoot, "system-asseets", "design", "source-files")
		}
	}

	if backendEntry == "" || !pathExists(backendEntry) {
		return startArtifacts{}, fmt.Errorf("ZeroShot server artifact was not found: %s", backendEntry)
	}
	if frontendDist == "" || !pathExists(frontendDist) {
		return startArtifacts{}, fmt.Errorf("ZeroShot frontend artifact was not found: %s", frontendDist)
	}
	if pipelineEntry == "" || !pathExists(pipelineEntry) {
		return startArtifacts{}, fmt.Errorf("ZeroShot pipeline entry was not found: %s", pipelineEntry)
	}

	return startArtifacts{
		backendEntry:       backendEntry,
		frontendDist:       frontendDist,
		pipelineEntry:      pipelineEntry,
		resourceSourceRoot: resourceSourceRoot,
	}, nil
}
