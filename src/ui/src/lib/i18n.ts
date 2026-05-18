import { useEffect, useMemo } from "react";
import { detectLocale, localeLabel, localeLanguageName, translate, type SupportedLocale } from "@/lib/i18n-core";

export type { SupportedLocale } from "@/lib/i18n-core";
export { detectLocale, localeLabel, localeLanguageName, supportedLocales, translate } from "@/lib/i18n-core";

export function useI18n() {
  const locale = useMemo(() => detectLocale(), []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return {
    locale,
    languageLabel: localeLabel(locale),
    responseLanguage: localeLanguageName(locale),
    t: (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate(locale, key, params)
  };
}

export function translateForLocale(locale: SupportedLocale, key: Parameters<typeof translate>[1], params?: Record<string, string | number>): string {
  return translate(locale, key, params);
}
