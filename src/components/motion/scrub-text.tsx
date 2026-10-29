'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

type Part = { text: string; emphasis?: boolean }

/** A statement whose words light up one by one as it scrolls through the viewport. */
export function ScrubText({ parts, className }: { parts: Part[]; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '[data-word]',
          { opacity: 0.16 },
          {
            opacity: 1,
            stagger: 0.08,
            ease: 'none',
            scrollTrigger: { trigger: ref.current, start: 'top 85%', end: 'bottom 45%', scrub: 0.6 },
          },
        )
      })
      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <p ref={ref} className={className}>
      {parts.map((part, pi) =>
        part.text.split(' ').map((w, wi) => (
          <span key={`${pi}-${wi}`} data-word className={part.emphasis ? 'text-accent' : undefined}>
            {w}{' '}
          </span>
        )),
      )}
    </p>
  )
}
