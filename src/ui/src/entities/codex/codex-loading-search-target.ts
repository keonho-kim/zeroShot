import type { CodexLogTranslate } from "@/entities/codex/codex-loading-log";

function compact(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

export function hostnameFromUrl(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return compact(value);
  }
}

function hostnameFromDomain(value: string): string {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/[/),.;:!?]+$/g, "")
    .trim();
}

function searchTargetFromQuery(query: string, t: CodexLogTranslate): { query: string; target: string } {
  const siteMatch = /\bsite:(?<domain>[^\s)]+)/i.exec(query);
  const urlMatch = /https?:\/\/[^\s<>)\]]+/i.exec(query);
  const domainMatch = /\b(?<domain>(?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/[^\s<>)\]]*)?/i.exec(query);
  const rawTarget = siteMatch?.groups?.domain ?? (urlMatch ? hostnameFromUrl(urlMatch[0]) : domainMatch?.groups?.domain ?? "");
  const target = rawTarget ? hostnameFromDomain(rawTarget) : t("log.searchTarget.web");
  const cleanedQuery = compact(
    query
      .replace(/\bsite:[^\s)]+/gi, "")
      .replace(/https?:\/\/[^\s<>)\]]+/gi, "")
      .replace(domainMatch && !urlMatch ? domainMatch[0] : "", "")
      .replace(/\s+/g, " ")
      .trim()
  );
  return {
    query: cleanedQuery || query.trim(),
    target
  };
}

export function searchDetail(query: string, t: CodexLogTranslate): string {
  const formatted = searchTargetFromQuery(query.trim(), t);
  return [formatted.target, formatted.query].filter(Boolean).join(" · ");
}
