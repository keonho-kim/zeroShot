import type { SupportedLocale } from "@/lib/i18n/locales";

type TranslationValues<English extends Record<string, string>> = { [Key in keyof English]: string };
type TranslationOverrides<English extends Record<string, string>> = Partial<Record<Exclude<SupportedLocale, "en">, Partial<TranslationValues<English>>>>;

export type TranslationBundle<English extends Record<string, string>> = { en: English } & TranslationOverrides<English>;

export function defineTranslations<const English extends Record<string, string>>(bundle: TranslationBundle<English>): TranslationBundle<English> {
  return bundle;
}
