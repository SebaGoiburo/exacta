import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  // Spanish lives at "/", English at "/en".
  localePrefix: 'as-needed',
  // Always Spanish unless the visitor picks English: the browser's language doesn't redirect anyone.
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]
