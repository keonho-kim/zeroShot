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

func scaffoldFrontend(target bootstrapTarget, force bool, writeMetadata bool) error {
	extension := "ts"
	if target.language == "javascript" {
		extension = "js"
	}
	sourceRoot := filepath.Join(target.root, "src")
	for _, dir := range []string{"app", "pages", "components", "hooks", "stores", "types", "common", "lib"} {
		if err := ensureDir(filepath.Join(sourceRoot, dir)); err != nil {
			return err
		}
	}
	if writeMetadata {
		if err := writeFrontendPackageJSON(target, force); err != nil {
			return err
		}
	}
	return writeFileIfMissing(filepath.Join(sourceRoot, "app", "main."+extension), "export function main() {\n  return null;\n}\n", force)
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
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(packageRoot, dir)); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(packageRoot, dir, "__init__.py"), "", force); err != nil {
			return err
		}
	}
	if writeMetadata && !pathExists(filepath.Join(target.root, "pyproject.toml")) {
		if err := writeNativePythonProject(target, pythonVersion, force); err != nil {
			return err
		}
	}
	return writeFileIfMissing(filepath.Join(packageRoot, "__init__.py"), "def main() -> None:\n    print(\"Hello from "+target.name+"!\")\n", force)
}

func scaffoldTypeScriptBackend(target bootstrapTarget, force bool) error {
	extension := "ts"
	if target.language == "javascript" {
		extension = "js"
	}
	sourceRoot := filepath.Join(target.root, "src")
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(sourceRoot, dir)); err != nil {
			return err
		}
	}
	return writeFileIfMissing(filepath.Join(sourceRoot, "main."+extension), "export function main() {\n  console.log(\"Hello from "+target.name+"!\");\n}\n\nmain();\n", force)
}

func scaffoldGo(target bootstrapTarget, force bool) error {
	for _, dir := range []string{"cmd/server", "internal/api", "internal/core", "internal/common", "internal/integrations", "internal/services", "internal/models", "internal/config"} {
		if err := ensureDir(filepath.Join(target.root, dir)); err != nil {
			return err
		}
	}
	content := "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"Hello from " + target.name + "!\")\n}\n"
	return writeFileIfMissing(filepath.Join(target.root, "cmd", "server", "main.go"), content, force)
}

func scaffoldRust(target bootstrapTarget, force bool) error {
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(target.root, "src", dir)); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(target.root, "src", dir, "mod.rs"), "", force); err != nil {
			return err
		}
	}
	return nil
}

func scaffoldJava(target bootstrapTarget, force bool, writeMetadata bool) error {
	javaPackage := javaPackageName(target.module, target.name)
	base := filepath.Join(append([]string{target.root, "src", "main", "java"}, strings.Split(javaPackage, ".")...)...)
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(base, dir)); err != nil {
			return err
		}
	}
	if !writeMetadata || pathExists(filepath.Join(target.root, "build.gradle")) || pathExists(filepath.Join(target.root, "build.gradle.kts")) {
		return nil
	}
	return writeMavenProject(target, javaPackage, force)
}

func scaffoldRuby(target bootstrapTarget, force bool) error {
	module := rubyFileName(target.name)
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(target.root, "lib", module, dir)); err != nil {
			return err
		}
	}
	return nil
}

func scaffoldZig(target bootstrapTarget, force bool) error {
	for _, dir := range []string{"api", "core", "common", "integrations", "services", "models", "config"} {
		if err := ensureDir(filepath.Join(target.root, "src", dir)); err != nil {
			return err
		}
		if err := writeFileIfMissing(filepath.Join(target.root, "src", dir, ".gitkeep"), "", force); err != nil {
			return err
		}
	}
	return nil
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
