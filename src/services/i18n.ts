// src/services/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import gu from '../locales/gu.json';
import { storage } from '../storage';

const LANGUAGE_KEY = 'app_language';

export const supportedLanguages = ['en', 'gu'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

const getInitialLanguage = (): SupportedLanguage => {
  const saved = storage.getString(LANGUAGE_KEY) as SupportedLanguage | undefined;
  if (saved && supportedLanguages.includes(saved)) return saved;
  const locale = Localization.getLocales()[0]?.languageCode;
  if (locale === 'gu') return 'gu';
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      gu: { translation: gu },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

export const changeLanguage = (lang: SupportedLanguage) => {
  storage.set(LANGUAGE_KEY, lang);
  return i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || 'en';
};

export default i18n;
