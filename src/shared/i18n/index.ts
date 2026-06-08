import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import vi from './locales/vi.json'

/**
 * i18next initialization. Imported once by providers.tsx so initialization
 * runs before any React tree mount.
 *
 * Detection order:
 * 1. `localStorage[i18nextLng]` — user-selected language sticks across sessions.
 * 2. `navigator.language` — browser default.
 * Falls back to `en` if neither matches a supported language.
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi'],
    nonExplicitSupportedLngs: true, // 'vi-VN' counts as 'vi'
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    returnNull: false,
    debug: import.meta.env.DEV,
  })

export default i18n
