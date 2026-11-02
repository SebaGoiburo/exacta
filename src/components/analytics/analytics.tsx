'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import {
  captureAttribution,
  CONSENT_OPEN_EVENT,
  loadTracking,
  readConsent,
  saveConsent,
  track,
  trackPageView,
  type Consent,
  type TrackingIds,
} from '@/lib/analytics'

/** Records where the visit came from, and loads pixels only after consent. No IDs set means no banner. */
export function Analytics(ids: TrackingIds) {
  const t = useTranslations('consent')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const firstPath = useRef(true)
  const configured = Boolean(ids.metaPixelId || ids.ga4Id || ids.googleAdsId)

  useEffect(() => {
    captureAttribution()
    if (!configured) return
    const saved = readConsent()
    if (saved === 'granted') loadTracking(ids)
    if (!saved) setOpen(true)

    const reopen = () => setOpen(true)
    // WhatsApp links are all over the site, so they're tracked from one place.
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href*="wa.me"]')) track('contact_click')
    }
    window.addEventListener(CONSENT_OPEN_EVENT, reopen)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, reopen)
      document.removeEventListener('click', onClick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured])

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false
      return
    }
    trackPageView(pathname)
  }, [pathname])

  function decide(value: Consent) {
    const previous = readConsent()
    saveConsent(value)
    setOpen(false)
    if (value === 'granted') loadTracking(ids)
    // Tags already running can't be unloaded: reloading is what actually stops them.
    else if (previous === 'granted') window.location.reload()
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label={t('label')}
      className="fixed inset-x-4 bottom-4 z-[60] border border-line-strong bg-bg-elev p-5 shadow-2xl sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-md"
    >
      <p className="text-sm leading-relaxed text-ink">
        {t('text')}{' '}
        <Link href="/privacidad" className="underline underline-offset-2 hover:text-accent">
          {t('more')}
        </Link>
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => decide('granted')} className="btn btn-primary btn-sm flex-1">
          {t('accept')}
        </button>
        <button type="button" onClick={() => decide('denied')} className="btn btn-ghost btn-sm flex-1">
          {t('reject')}
        </button>
      </div>
    </div>
  )
}
