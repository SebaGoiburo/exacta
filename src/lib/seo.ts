import type { Metadata } from 'next'
import { routing, type Locale } from '@/i18n/routing'
import { site } from './site'

/** Only the real domain gets indexed, so test hosts never compete with it on Google. */
export function isIndexable() {
  return process.env.NEXT_PUBLIC_SERVER_URL === site.url
}

/** Path for a locale. `path` starts with "/", or is empty for the home. */
export function localePath(locale: Locale, path = '') {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  return `${prefix}${path}` || '/'
}

export function absoluteUrl(locale: Locale, path = '') {
  return `${site.url}${localePath(locale, path)}`
}

/** Canonical and hreflang for a page. Each page must set its own: a layout's would apply to all of them. */
export function pageAlternates(locale: Locale, path = ''): Metadata['alternates'] {
  return {
    canonical: localePath(locale, path),
    languages: {
      es: localePath('es', path),
      en: localePath('en', path),
      'x-default': localePath(routing.defaultLocale, path),
    },
  }
}
