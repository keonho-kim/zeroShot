export type SupportedLocale = "ko" | "en" | "zh" | "ja" | "es" | "de";

const languageNames: Record<SupportedLocale, string> = {
  ko: "Korean",
  en: "English",
  zh: "Chinese",
  ja: "Japanese",
  es: "Spanish",
  de: "German"
};

export function normalizeLocale(value: unknown): SupportedLocale {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("de")) return "de";
  return "en";
}

export function languageName(locale: string): string {
  return languageNames[normalizeLocale(locale)];
}

export function textByLocale(locale: string, values: Record<SupportedLocale, string>): string {
  return values[normalizeLocale(locale)];
}
