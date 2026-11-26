'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

/**
 * What the page does once it's in the browser: tell Meta someone saw the offer, bring each section's parts in as
 * it arrives, and show the phone's sticky action only between the first screen and the ticket.
 */
export function PageEffects({ price }: { price: number }) {
  useEffect(() => {
    track('view_content', { value: price, currency: 'ARS', content_name: 'Masterclass IA para Humanos' })

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute('data-in', '')
          reveal.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el))

    const sticky = document.getElementById('iah-sticky')
    const hero = document.getElementById('iah-hero-cta')
    const ticket = document.getElementById('reservar')
    const seen = { hero: true, ticket: false }
    const watch = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) seen.hero = e.isIntersecting
        if (e.target === ticket) seen.ticket = e.isIntersecting
      }
      sticky?.toggleAttribute('data-show', !seen.hero && !seen.ticket)
    })
    if (hero) watch.observe(hero)
    if (ticket) watch.observe(ticket)
    return () => {
      reveal.disconnect()
      watch.disconnect()
    }
  }, [price])
  return null
}

/** Back and forward for the row of modules. On a phone the row is swiped and these are hidden. */
export function ProgramButtons({ target, className, buttonClass }: { target: string; className: string; buttonClass: string }) {
  const move = (dir: 1 | -1) => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(target)?.scrollBy({ left: dir * 318, behavior: smooth ? 'smooth' : 'auto' })
  }
  return (
    <div className={className}>
      <button type="button" className={buttonClass} onClick={() => move(-1)} aria-label="Módulo anterior">
        ←
      </button>
      <button type="button" className={buttonClass} onClick={() => move(1)} aria-label="Módulo siguiente">
        →
      </button>
    </div>
  )
}
