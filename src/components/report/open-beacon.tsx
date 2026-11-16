'use client'

import { useEffect } from 'react'

const SECTIONS = ['comparacion', 'hallazgos', 'propuesta', 'final']

/**
 * Tells us how the report was read: the open (only after a few seconds on screen, once per visit),
 * the furthest section the reader reached and the buttons they pressed. Sections and buttons are
 * marked in the page with data-report-section and data-report-cta.
 */
export function OpenBeacon({ token }: { token: string }) {
  useEffect(() => {
    const send = (event: string, value = '') =>
      void fetch('/api/informe/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, event, value }),
        keepalive: true,
      }).catch(() => undefined)

    // Each section counts once, and only after the open: a quick skim to the bottom isn't reading.
    let opened = false
    let furthest = -1
    const visible = new Set<number>()
    const reportReach = () => {
      if (!opened || !visible.size) return
      const index = Math.max(...visible)
      if (index > furthest) {
        furthest = index
        send('reach', SECTIONS[index])
      }
    }

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return
      opened = true
      send('open')
      reportReach()
    }, 4000)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = SECTIONS.indexOf((entry.target as HTMLElement).dataset.reportSection ?? '')
          if (index < 0) continue
          if (entry.isIntersecting) visible.add(index)
          else visible.delete(index)
        }
        reportReach()
      },
      // A section counts once its top reaches the upper 60% of the screen, however tall it is.
      { rootMargin: '0px 0px -40% 0px', threshold: 0 },
    )
    document.querySelectorAll<HTMLElement>('[data-report-section]').forEach((el) => observer.observe(el))

    const onClick = (e: MouseEvent) => {
      const cta = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-report-cta]')?.dataset.reportCta
      if (cta) send('click', cta)
    }
    document.addEventListener('click', onClick)

    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
      document.removeEventListener('click', onClick)
    }
  }, [token])
  return null
}
