package main

import (
	"fmt"
	"path/filepath"
	"strings"
)

func applyStandardScaffold(target bootstrapTarget, force bool, pythonVersion string, writeMetadata bool) error {
	switch target.role {
	case "ui":
		return scaffoldFrontend(target, force, writeMetadata)
	default:
		return scaffoldBackend(target, force, pythonVersion, writeMetadata)
	}
}

func backendConstantDir(language string) string {
	switch language {
	case "typescript", "javascript", "python":
		return "const"
	default:
		return "constants"
	}
}

func ensureDirs(root string, dirs []string) error {
	for _, dir := range dirs {
		if err := ensureDir(filepath.Join(root, dir)); err != nil {
			return err
		}
	}
	return nil
}

func scaffoldFrontend(target bootstrapTarget, force bool, writeMetadata bool) error {
	extension := "ts"
	if target.language == "javascript" {
		extension = "js"
	}
	sourceRoot := filepath.Join(target.root, "src")
	if err := ensureDirs(sourceRoot, []string{"app", "pages", "widgets", "features", "entities", "shared", "lib/api/const", "hooks", "store", "styles"}); err != nil {
		return err
	}
	if writeMetadata {
		if err := writeFrontendPackageJSON(target, force); err != nil {
			return err
		}
	}
	if target.language == "javascript" {
		if err := writeFileIfMissing(filepath.Join(sourceRoot, "lib", "api", "const", "routes."+extension), "export const API_ROUTES = Object.freeze({\n  health: \"/api/health\"\n});\n", force); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(sourceRoot, "lib", "api", "client."+extension), "export async function apiRequest(path, init) {\n  return fetch(path, init);\n}\n", force); err != nil {
			return err
		}
		return writeFileIfMissing(filepath.Join(sourceRoot, "app", "main."+extension), "export function main() {\n  return null;\n}\n", force)
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "lib", "api", "const", "routes."+extension), "export const API_ROUTES = {\n  health: \"/api/health\"\n} as const;\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "lib", "api", "client."+extension), "export async function apiRequest(path: string, init?: RequestInit): Promise<Response> {\n  return fetch(path, init);\n}\n", force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(sourceRoot, "app", "main."+extension), "export function main(): null {\n  return null;\n}\n", force)
}

func scaffoldBackend(target bootstrapTarget, force bool, pythonVersion string, writeMetadata bool) error {
	switch target.language {
	case "python":
		return scaffoldPython(target, force, pythonVersion, writeMetadata)
	case "typescript", "javascript":
		return scaffoldTypeScriptBackend(target, force)
	case "go":
		return scaffoldGo(target, force)
	case "rust":
		return scaffoldRust(target, force)
	case "java":
		return scaffoldJava(target, force, writeMetadata)
	case "ruby":
		if writeMetadata {
			if err := writeRubyProject(target, force); err != nil {
				return err
			}
		}
		return scaffoldRuby(target, force)
	case "zig":
		return scaffoldZig(target, force)
	default:
		return fmt.Errorf("unsupported backend language: %s", target.language)
	}
}

func scaffoldPython(target bootstrapTarget, force bool, pythonVersion string, writeMetadata bool) error {
	module := pythonModuleName(target.module)
	if module == "" {
		module = pythonModuleName(target.name)
	}
	packageRoot := filepath.Join(target.root, "src", module)
	dirs := []string{"app", "routes", "services", "services/system", "services/system/const", "integrations", "core", "config", "types"}
	if err := ensureDirs(packageRoot, dirs); err != nil {
		return err
	}
	for _, dir := range dirs {
		if err := writeFileIfMissing(filepath.Join(packageRoot, dir, "__init__.py"), "", force); err != nil {
			return err
		}
	}
	if writeMetadata && !pathExists(filepath.Join(target.root, "pyproject.toml")) {
		if err := writeNativePythonProject(target, pythonVersion, force); err != nil {
			return err
		}
	}
	if err := writeFileIfMissing(filepath.Join(packageRoot, "app", "main.py"), "def main() -> None:\n    print(\"Hello from "+target.name+"!\")\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(packageRoot, "services", "system", "const", "runtime.py"), "SYSTEM_STATUS = \"ready\"\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(packageRoot, "services", "system", "service.py"), "def describe_system() -> dict[str, str]:\n    return {\"status\": \"ready\"}\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(packageRoot, "types", "system.py"), "from typing import TypedDict\n\n\nclass SystemStatus(TypedDict):\n    status: str\n", force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(packageRoot, "__init__.py"), "def main() -> None:\n    print(\"Hello from "+target.name+"!\")\n", force)
}

func scaffoldTypeScriptBackend(target bootstrapTarget, force bool) error {
	extension := "ts"
	if target.language == "javascript" {
		extension = "js"
	}
	sourceRoot := filepath.Join(target.root, "src")
	constDir := backendConstantDir(target.language)
	if err := ensureDirs(sourceRoot, []string{"app", "routes", filepath.Join("services", "system", constDir), "integrations", "core", "config", "types"}); err != nil {
		return err
	}
	if target.language == "javascript" {
		if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "system", constDir, "runtime."+extension), "export const SYSTEM_STATUS = \"ready\";\n", force); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "system", "service."+extension), "export function describeSystem() {\n  return { status: \"ready\" };\n}\n", force); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(sourceRoot, "types", "system."+extension), "export const systemStatusShape = {\n  status: \"ready\"\n};\n", force); err != nil {
			return err
		}
		return writeFileIfMissing(filepath.Join(sourceRoot, "app", "main."+extension), "export function main() {\n  console.log(\"Hello from "+target.name+"!\");\n}\n\nmain();\n", force)
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "system", constDir, "runtime."+extension), "export const SYSTEM_STATUS = \"ready\" as const;\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "system", "service."+extension), "export interface SystemStatus {\n  status: \"ready\";\n}\n\nexport function describeSystem(): SystemStatus {\n  return { status: \"ready\" };\n}\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "types", "system."+extension), "export interface SystemStatus {\n  status: string;\n}\n", force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(sourceRoot, "app", "main."+extension), "export function main(): void {\n  console.log(\"Hello from "+target.name+"!\");\n}\n\nmain();\n", force)
}

func scaffoldGo(target bootstrapTarget, force bool) error {
	if err := ensureDirs(target.root, []string{"cmd/server", "internal/app", "internal/routes", "internal/services/system/constants", "internal/integrations", "internal/core", "internal/config", "internal/types"}); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(target.root, "internal", "services", "system", "constants", "runtime.go"), "package constants\n\nconst SystemStatus = \"ready\"\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(target.root, "internal", "services", "system", "service.go"), "package system\n\ntype Status struct {\n\tStatus string `json:\"status\"`\n}\n\nfunc Describe() Status {\n\treturn Status{Status: \"ready\"}\n}\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(target.root, "internal", "types", "system.go"), "package types\n\ntype SystemStatus struct {\n\tStatus string `json:\"status\"`\n}\n", force); err != nil {
		return err
	}
	content := "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"Hello from " + target.name + "!\")\n}\n"
	return writeFileIfMissing(filepath.Join(target.root, "cmd", "server", "main.go"), content, force)
}

func scaffoldRust(target bootstrapTarget, force bool) error {
	sourceRoot := filepath.Join(target.root, "src")
	dirs := []string{"app", "routes", "services", "services/system", "services/system/constants", "integrations", "core", "config", "types"}
	if err := ensureDirs(sourceRoot, dirs); err != nil {
		return err
	}
	for _, dir := range []string{"app", "routes", "integrations", "core", "config"} {
		if err := writeFileIfMissing(filepath.Join(sourceRoot, dir, "mod.rs"), "", force); err != nil {
			return err
		}
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "mod.rs"), "pub mod system;\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "system", "constants", "mod.rs"), "pub const SYSTEM_STATUS: &str = \"ready\";\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "system", "mod.rs"), "pub mod constants;\n\npub struct SystemStatus {\n    pub status: &'static str,\n}\n\npub fn describe_system() -> SystemStatus {\n    SystemStatus { status: constants::SYSTEM_STATUS }\n}\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "types", "mod.rs"), "pub struct SystemStatus {\n    pub status: String,\n}\n", force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(sourceRoot, "main.rs"), "fn main() {\n    println!(\"Hello from "+target.name+"!\");\n}\n", force)
}

func scaffoldJava(target bootstrapTarget, force bool, writeMetadata bool) error {
	javaPackage := javaPackageName(target.module, target.name)
	base := filepath.Join(append([]string{target.root, "src", "main", "java"}, strings.Split(javaPackage, ".")...)...)
	if err := ensureDirs(base, []string{"app", "routes", "services/system/constants", "integrations", "core", "config", "types"}); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(base, "app", "Application.java"), "package "+javaPackage+".app;\n\npublic final class Application {\n  private Application() {}\n\n  public static void main(String[] args) {\n    System.out.println(\"Hello from "+target.name+"!\");\n  }\n}\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(base, "services", "system", "constants", "SystemConstants.java"), "package "+javaPackage+".services.system.constants;\n\npublic final class SystemConstants {\n  public static final String STATUS = \"ready\";\n\n  private SystemConstants() {}\n}\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(base, "services", "system", "SystemService.java"), "package "+javaPackage+".services.system;\n\nimport "+javaPackage+".services.system.constants.SystemConstants;\nimport "+javaPackage+".types.SystemStatus;\n\npublic final class SystemService {\n  public SystemStatus describe() {\n    return new SystemStatus(SystemConstants.STATUS);\n  }\n}\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(base, "types", "SystemStatus.java"), "package "+javaPackage+".types;\n\npublic record SystemStatus(String status) {}\n", force); err != nil {
		return err
	}
	if !writeMetadata || pathExists(filepath.Join(target.root, "build.gradle")) || pathExists(filepath.Join(target.root, "build.gradle.kts")) {
		return nil
	}
	return writeMavenProject(target, javaPackage, force)
}

func scaffoldRuby(target bootstrapTarget, force bool) error {
	module := rubyFileName(target.name)
	className := rubyModuleName(target.name)
	base := filepath.Join(target.root, "lib", module)
	if err := ensureDirs(base, []string{"app", "routes", "services/system/constants", "integrations", "core", "config", "types"}); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(target.root, "lib", module+".rb"), "module "+className+"\nend\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(base, "services", "system", "constants", "runtime.rb"), "module "+className+"\n  module Services\n    module System\n      module Constants\n        STATUS = \"ready\"\n      end\n    end\n  end\nend\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(base, "services", "system", "service.rb"), "module "+className+"\n  module Services\n    module System\n      def self.describe\n        { status: \"ready\" }\n      end\n    end\n  end\nend\n", force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(base, "types", "system_status.rb"), "module "+className+"\n  module Types\n    SystemStatus = Struct.new(:status, keyword_init: true)\n  end\nend\n", force)
}

func scaffoldZig(target bootstrapTarget, force bool) error {
	sourceRoot := filepath.Join(target.root, "src")
	dirs := []string{"app", "routes", "services/system/constants", "integrations", "core", "config", "types"}
	if err := ensureDirs(sourceRoot, dirs); err != nil {
		return err
	}
	for _, dir := range dirs {
		if err := writeFileIfMissing(filepath.Join(sourceRoot, dir, ".gitkeep"), "", force); err != nil {
			return err
		}
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "system", "constants", "runtime.zig"), "pub const system_status = \"ready\";\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "services", "system", "service.zig"), "const runtime = @import(\"constants/runtime.zig\");\n\npub const SystemStatus = struct {\n    status: []const u8,\n};\n\npub fn describeSystem() SystemStatus {\n    return .{ .status = runtime.system_status };\n}\n", force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(sourceRoot, "types", "system.zig"), "pub const SystemStatus = struct {\n    status: []const u8,\n};\n", force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(sourceRoot, "main.zig"), "const std = @import(\"std\");\n\npub fn main() void {\n    std.debug.print(\"Hello from "+target.name+"!\\n\", .{});\n}\n", force)
}

func writeNativePythonProject(target bootstrapTarget, pythonVersion string, force bool) error {
	module := pythonModuleName(target.module)
	if module == "" {
		module = pythonModuleName(target.name)
	}
	content := "[project]\nname = \"" + target.name + "\"\nversion = \"0.1.0\"\ndescription = \"Add your description here\"\nreadme = \"README.md\"\nrequires-python = \">=" + pythonVersion + "\"\ndependencies = []\n\n[project.scripts]\n" + target.name + " = \"" + module + ":main\"\n\n[dependency-groups]\ndev = [\"ruff\", \"ty\", \"pytest\", \"pytest-asyncio\"]\n\n[build-system]\nrequires = [\"setuptools>=69\"]\nbuild-backend = \"setuptools.build_meta\"\n"
	if target.projectType == "script" {
		content = "[project]\nname = \"" + target.name + "\"\nversion = \"0.1.0\"\ndescription = \"Add your description here\"\nreadme = \"README.md\"\nrequires-python = \">=" + pythonVersion + "\"\ndependencies = []\n\n[dependency-groups]\ndev = [\"ruff\", \"ty\", \"pytest\", \"pytest-asyncio\"]\n"
	}
	if err := writeFileIfMissing(filepath.Join(target.root, "pyproject.toml"), content, force); err != nil {
		return err
	}
	if err := writeFileIfMissing(filepath.Join(target.root, ".python-version"), pythonVersion+"\n", force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(target.root, "README.md"), "# "+target.name+"\n", force)
}

func writeMavenProject(target bootstrapTarget, javaPackage string, force bool) error {
	pom := "<project xmlns=\"http://maven.apache.org/POM/4.0.0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>" + javaPackage + "</groupId>\n  <artifactId>" + target.name + "</artifactId>\n  <version>0.1.0</version>\n  <properties>\n    <maven.compiler.release>21</maven.compiler.release>\n  </properties>\n</project>\n"
	return writeFileIfMissing(filepath.Join(target.root, "pom.xml"), pom, force)
}

func writeRubyProject(target bootstrapTarget, force bool) error {
	module := rubyFileName(target.name)
	className := rubyModuleName(target.name)
	if err := writeFileIfMissing(filepath.Join(target.root, "Gemfile"), "source \"https://rubygems.org\"\n\ngemspec\n", force); err != nil {
		return err
	}
	gemspec := "Gem::Specification.new do |spec|\n  spec.name = \"" + target.name + "\"\n  spec.version = \"0.1.0\"\n  spec.summary = \"Add your summary here\"\n  spec.files = Dir[\"lib/**/*.rb\"]\n  spec.require_paths = [\"lib\"]\nend\n"
	if err := writeFileIfMissing(filepath.Join(target.root, target.name+".gemspec"), gemspec, force); err != nil {
		return err
	}
	return writeFileIfMissing(filepath.Join(target.root, "lib", module+".rb"), "module "+className+"\nend\n", force)
}

func writeFrontendPackageJSON(target bootstrapTarget, force bool) error {
	path := filepath.Join(target.root, "package.json")
	if !force && pathExists(path) {
		return nil
	}
	content := `{
  "name": "` + target.name + `",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
`
	return writeFileIfMissing(path, content, force)
}
