function bootstrapArg(args: string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : "";
  return value && !value.startsWith("--") ? value : "";
}

function titleCase(value: string): string {
  if (!value) {
    return "";
  }
  if (value === "typescript") {
    return "TypeScript";
  }
  if (value === "javascript") {
    return "JavaScript";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function bootstrapLanguageSummary(args: string[]): { summary: string; profile: string } | null {
  const projectType = bootstrapArg(args, "--type");
  if (!projectType) {
    return null;
  }

  const language = bootstrapArg(args, "--language");
  const serverLanguage = bootstrapArg(args, "--server-language") || language;
  const uiLanguage = bootstrapArg(args, "--ui-language");
  const profile = bootstrapArg(args, "--profile");
  const typeLabel = titleCase(projectType);
  let stackLabel = "";

  if (projectType === "fullstack") {
    const serverLabel = titleCase(serverLanguage);
    const uiLabel = uiLanguage === "typescript" || uiLanguage === "javascript" ? "React" : titleCase(uiLanguage);
    stackLabel = [serverLabel, uiLabel].filter(Boolean).join(" + ");
  } else if (projectType === "frontend") {
    stackLabel = titleCase(uiLanguage || language);
  } else {
    stackLabel = titleCase(serverLanguage || language);
  }

  if (!stackLabel) {
    return null;
  }

  return {
    summary: `${typeLabel} · ${stackLabel}`,
    profile: profile === "llm" ? "LLM profile" : ""
  };
}
