package main

import (
	"os/exec"
	"regexp"
	"strings"
)

func normalizeLanguage(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "ts":
		return "typescript"
	case "js":
		return "javascript"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func packageName(value string) string {
	parts := regexp.MustCompile(`[^a-zA-Z0-9]+`).Split(strings.ToLower(value), -1)
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			clean = append(clean, part)
		}
	}
	return strings.Join(clean, "-")
}

func moduleName(value string, language string, fallback string) string {
	if value != "" {
		return value
	}
	switch language {
	case "python":
		return pythonModuleName(fallback)
	case "java":
		return "com.example." + pythonModuleName(fallback)
	default:
		return fallback
	}
}

func pythonModuleName(value string) string {
	clean := regexp.MustCompile(`[^a-zA-Z0-9]+`).ReplaceAllString(strings.ToLower(value), "_")
	clean = strings.Trim(clean, "_")
	if clean == "" {
		return ""
	}
	if clean[0] >= '0' && clean[0] <= '9' {
		return "app_" + clean
	}
	return clean
}

func javaPackageName(module string, fallback string) string {
	value := module
	if value == "" {
		value = "com.example." + pythonModuleName(fallback)
	}
	parts := strings.Split(strings.ToLower(value), ".")
	for index, part := range parts {
		parts[index] = pythonModuleName(part)
	}
	return strings.Join(parts, ".")
}

func rubyFileName(value string) string {
	return pythonModuleName(value)
}

func rubyModuleName(value string) string {
	parts := strings.Split(pythonModuleName(value), "_")
	for index, part := range parts {
		if part == "" {
			continue
		}
		parts[index] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, "")
}

func firstAvailableTool(names ...string) string {
	for _, name := range names {
		if _, err := exec.LookPath(name); err == nil {
			return name
		}
	}
	return ""
}
