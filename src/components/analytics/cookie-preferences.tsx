'use client'

import { useTranslations } from 'next-intl'
import { CONSENT_OPEN_EVENT } from '@/lib/analytics'

export function CookiePreferences() {
  const t = useTranslations('consent')
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
      className="tracking-[0.06em] transition-colors hover:text-accent"
    >
      {t('label')}
    </button>
  )
}
