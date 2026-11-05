'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type LenisInstance from 'lenis'
import { useDeferredMotion } from './motion-runtime'

const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)'

// Ends any glide and takes the page's current position and height as the new starting point.
function settleLenis(lenis: LenisInstance | null) {
  if (!lenis) return
  lenis.stop()
  lenis.start()
  lenis.resize()
}

/**
 * Global motion: scroll reveals for any element with `data-reveal` and smooth
 * scrolling on devices with a mouse (Lenis, synced with ScrollTrigger).
 * Optional `data-reveal-delay` (seconds) staggers siblings.
 * Content in the first screen uses `data-intro` instead, which needs no JavaScript.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const lenisRef = useRef<LenisInstance | null>(null)
  const lastPath = useRef<string | null>(null)
  const returning = useRef(false)

  useDeferredMotion(
    ({ gsap, ScrollTrigger }) => {
      let stopped = false
      let dispose = () => {}

      import('lenis')
        .then(({ default: Lenis }) => {
          if (stopped) return
          const lenis = new Lenis({ duration: 1.1, anchors: { offset: -80 } })
          lenisRef.current = lenis
          lenis.on('scroll', ScrollTrigger.update)
          const raf = (time: number) => lenis.raf(time * 1000)
          gsap.ticker.add(raf)
          gsap.ticker.lagSmoothing(0)
          dispose = () => {
            gsap.ticker.remove(raf)
            lenisRef.current = null
            lenis.destroy()
          }
        })
        .catch(() => {})

      return () => {
        stopped = true
        dispose()
      }
    },
    { media: '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)' },
  )

  // Back and forward keep the position the browser restores.
  useEffect(() => {
    const onPopState = () => {
      returning.current = window.location.pathname !== lastPath.current
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // If Lenis is still gliding, its next frame would carry the new page back to where the
  // old one was heading, so it stops in the same commit. The URL isn't updated yet here.
  useLayoutEffect(() => settleLenis(lenisRef.current), [pathname])

  // A new page starts at the top. Removing a pin changes the page height mid-navigation,
  // so this can't be left to the router.
  useEffect(() => {
    const previous = lastPath.current
    const current = window.location.pathname
    lastPath.current = current
    const wasReturning = returning.current
    returning.current = false
    if (previous === null || previous === current || wasReturning || window.location.hash) return

    window.scrollTo({ top: 0, behavior: 'instant' })
    settleLenis(lenisRef.current)
  }, [pathname])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          observer.unobserve(entry.target)
          const el = entry.target as HTMLElement
          el.dataset.revealed = ''
          el.animate(
            [
              { opacity: 0, transform: 'translateY(28px)' },
              { opacity: 1, transform: 'none' },
            ],
            {
              duration: 1000,
              easing: EASE_OUT_EXPO,
              delay: Number(el.dataset.revealDelay ?? 0) * 1000,
              fill: 'backwards',
            },
          )
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )

    document.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [pathname])

  return <>{children}</>
}
