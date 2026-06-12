import 'i18next'
import type { Resources, defaultNS } from '@/shared/i18n'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: Resources['vi']
  }
}
