type Frontmatter = Record<string, unknown>;

const frontmatterPattern = /^---\r?\n(?<frontmatter>[\s\S]*?)\r?\n---\r?\n?(?<body>[\s\S]*)$/;

function parseList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return [trimmed.replace(/^["']|["']$/g, "")];
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = frontmatterPattern.exec(raw);
  if (!match?.groups) {
    return { frontmatter: {}, body: raw.trim() };
  }

  const frontmatter = Object.fromEntries(
    match.groups.frontmatter
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf(":");
        if (index === -1) {
          return ["", ""];
        }
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();
        return [key, key === "tags" ? parseList(value) : value.replace(/^["']|["']$/g, "")];
      })
      .filter(([key]) => key)
  );

  return { frontmatter, body: match.groups.body.trim() };
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function markdownTitle(body: string, fallback: string): string {
  return /^#\s+(?<title>.+)$/m.exec(body)?.groups?.title.trim() || fallback;
}

export function markdownDescription(body: string): string {
  const paragraph = body
    .split(/\r?\n/)
    .map((line) => line.replace(/^>\s?/, "").trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("-"));
  return paragraph ?? "";
}
