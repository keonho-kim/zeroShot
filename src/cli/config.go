package main

import (
	"errors"
	"os"
	"path/filepath"

	"github.com/pelletier/go-toml/v2"
)

const defaultConfigText = `host = "127.0.0.1"
port = 32575
allowed_roots = []
default_approval = "never"
default_sandbox = "workspace-write"
max_iters = 30
stall_limit = 2
plan_reasoning = "high"
exec_reasoning = "medium"
validate_reasoning = "medium"
closeout_reasoning = "medium"
`

type appConfig struct {
	Host string `toml:"host"`
	Port int    `toml:"port"`
}

func userConfigPath() (string, error) {
	if value := os.Getenv("ZEROSHOT_APP_CONFIG"); value != "" {
		return value, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".zeroshot", "config.toml"), nil
}

func ensureUserConfig() (string, []byte, error) {
	configPath, err := userConfigPath()
	if err != nil {
		return "", nil, err
	}

	content, err := os.ReadFile(configPath)
	if err == nil {
		return configPath, content, nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return "", nil, err
	}

	if err := os.MkdirAll(filepath.Dir(configPath), 0o755); err != nil {
		return "", nil, err
	}
	content = []byte(defaultConfigText)
	if err := os.WriteFile(configPath, content, 0o644); err != nil {
		return "", nil, err
	}
	return configPath, content, nil
}

func loadAppConfig() (string, appConfig, error) {
	configPath, content, err := ensureUserConfig()
	if err != nil {
		return "", appConfig{}, err
	}

	config := appConfig{
		Host: "127.0.0.1",
		Port: 32575,
	}
	if err := toml.Unmarshal(content, &config); err != nil {
		return "", appConfig{}, err
	}
	if config.Host == "" {
		config.Host = "127.0.0.1"
	}
	if config.Port == 0 {
		config.Port = 32575
	}
	return configPath, config, nil
}
