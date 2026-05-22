import { supportedLocales, type SupportedLocale } from "@/lib/i18n/locales";
import { commonTranslations } from "@/lib/i18n/translations/common";
import { homeTranslations } from "@/lib/i18n/translations/home";
import { projectTranslations } from "@/lib/i18n/translations/project";
import { loginTranslations } from "@/lib/i18n/translations/login";
import { settingsTranslations } from "@/lib/i18n/translations/settings";
import { architectTranslations } from "@/lib/i18n/translations/architect";
import { buildTranslations } from "@/lib/i18n/translations/build";
import { updateTranslations } from "@/lib/i18n/translations/update";
import { workLogTranslations } from "@/lib/i18n/translations/work-log";
import { makeoverTranslations } from "@/lib/i18n/translations/makeover";

export type { SupportedLocale } from "@/lib/i18n/locales";
export { supportedLocales } from "@/lib/i18n/locales";

const localeNames: Record<SupportedLocale, string> = {
  ko: "Korean",
  en: "English",
  zh: "Chinese",
  ja: "Japanese",
  es: "Spanish",
  de: "German"
};

const localeLabels: Record<SupportedLocale, string> = {
  ko: "한국어",
  en: "English",
  zh: "中文",
  ja: "日本語",
  es: "Español",
  de: "Deutsch"
};

const en = {
  ...commonTranslations.en,
  ...homeTranslations.en,
  ...projectTranslations.en,
  ...loginTranslations.en,
  ...settingsTranslations.en,
  ...architectTranslations.en,
  ...buildTranslations.en,
  ...updateTranslations.en,
  ...workLogTranslations.en,
  ...makeoverTranslations.en
} as const;

export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

const translations: Record<SupportedLocale, Dictionary> = {
  en,
  ko: {
    ...en,
    ...commonTranslations.ko,
    ...homeTranslations.ko,
    ...projectTranslations.ko,
    ...loginTranslations.ko,
    ...settingsTranslations.ko,
    ...architectTranslations.ko,
    ...buildTranslations.ko,
    ...updateTranslations.ko,
    ...workLogTranslations.ko,
    ...makeoverTranslations.ko
  },
  zh: {
    ...en,
    ...commonTranslations.zh,
    ...homeTranslations.zh,
    ...projectTranslations.zh,
    ...loginTranslations.zh,
    ...settingsTranslations.zh,
    ...architectTranslations.zh,
    ...buildTranslations.zh,
    ...updateTranslations.zh,
    ...workLogTranslations.zh,
    ...makeoverTranslations.zh
  },
  ja: {
    ...en,
    ...commonTranslations.ja,
    ...homeTranslations.ja,
    ...projectTranslations.ja,
    ...loginTranslations.ja,
    ...settingsTranslations.ja,
    ...architectTranslations.ja,
    ...buildTranslations.ja,
    ...updateTranslations.ja,
    ...workLogTranslations.ja,
    ...makeoverTranslations.ja
  },
  es: {
    ...en,
    ...commonTranslations.es,
    ...homeTranslations.es,
    ...projectTranslations.es,
    ...loginTranslations.es,
    ...settingsTranslations.es,
    ...architectTranslations.es,
    ...buildTranslations.es,
    ...updateTranslations.es,
    ...workLogTranslations.es,
    ...makeoverTranslations.es
  },
  de: {
    ...en,
    ...commonTranslations.de,
    ...homeTranslations.de,
    ...projectTranslations.de,
    ...loginTranslations.de,
    ...settingsTranslations.de,
    ...architectTranslations.de,
    ...buildTranslations.de,
    ...updateTranslations.de,
    ...workLogTranslations.de,
    ...makeoverTranslations.de
  }
};

export function detectLocale(language?: string): SupportedLocale {
  const candidates = [
    language,
    ...(typeof navigator !== "undefined" ? Array.from(navigator.languages ?? []) : []),
    typeof navigator !== "undefined" ? navigator.language : ""
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = String(candidate).toLowerCase();
    if (normalized.startsWith("zh")) return "zh";
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("ko")) return "ko";
    if (normalized.startsWith("es")) return "es";
    if (normalized.startsWith("de")) return "de";
    if (normalized.startsWith("en")) return "en";
  }
  return "en";
}

export function localeLanguageName(locale: SupportedLocale): string {
  return localeNames[locale];
}

export function localeLabel(locale: SupportedLocale): string {
  return localeLabels[locale];
}

export function translate(locale: SupportedLocale, key: TranslationKey, params: Record<string, string | number> = {}): string {
  const template = translations[locale][key] ?? translations.en[key] ?? key;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}
