'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useDeferredMotion } from './motion-runtime'

const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Global motion: scroll reveals for any element with `data-reveal` and smooth
 * scrolling on devices with a mouse (Lenis, synced with ScrollTrigger).
 * Optional `data-reveal-delay` (seconds) staggers siblings.
 * Content in the first screen uses `data-intro` instead, which needs no JavaScript.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useDeferredMotion(
    ({ gsap, ScrollTrigger }) => {
      let stopped = false
      let dispose = () => {}

      import('lenis')
        .then(({ default: Lenis }) => {
          if (stopped) return
          const lenis = new Lenis({ duration: 1.1, anchors: { offset: -80 } })
          lenis.on('scroll', ScrollTrigger.update)
          const raf = (time: number) => lenis.raf(time * 1000)
          gsap.ticker.add(raf)
          gsap.ticker.lagSmoothing(0)
          dispose = () => {
            gsap.ticker.remove(raf)
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
