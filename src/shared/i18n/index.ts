import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enResources from '@/shared/i18n/resource/resource.en'
import viResources from '@/shared/i18n/resource/resource.vi'

/**
 * i18next initialization.
 *
 * File organization:
 *  - Translations split into per-domain JSON files for translator + diff convenience.
 *  - Each file holds ONE top-level key that mirrors the historical flat structure.
 *  - Runtime merges all files into a single `translation` namespace via object spread.
 *  - Components call `useTranslation()` with no args + path-style keys:
 *      t('common.save'), t('appShell.logout'), t('tagsView.close'), ...
 *  - Type augmentation in `types.d.ts` provides autocomplete + key-existence checking.
 *
 * Adding a new domain: create `locales/en/<domain>.json` with `{ "<domain>": { ... } }`,
 * mirror in `vi/`, import + spread here, import + add type in `types.d.ts`.
 */
const resources = {
  en: { translation: enResources },
  vi: { translation: viResources },
}

export type Resources = typeof resources

export const defaultNS = 'translation'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi'],
    nonExplicitSupportedLngs: true, // 'vi-VN' counts as 'vi'
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    returnNull: false,
    debug: import.meta.env.DEV,
  })

export default i18n
