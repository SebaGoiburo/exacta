'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { whatsappLink } from '@/lib/site'
import { Magnetic } from '@/components/motion/magnetic'
import { ArrowRight } from '@/components/ui/icons'
import { HeroDiagram, type HeroDiagramHandle } from './hero-diagram'

gsap.registerPlugin(ScrollTrigger, SplitText)

export function Hero() {
  const t = useTranslations('hero')
  const tw = useTranslations('whatsapp')
  const sectionRef = useRef<HTMLElement>(null)
  const diagramRef = useRef<HeroDiagramHandle>(null)
  const hintRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const state = diagramRef.current?.state
      const section = sectionRef.current
      if (!state || !section) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-intro]', { opacity: 1 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Intro: headline lines rise from behind a mask, the rest follows.
        // Unhide first so the from() tweens below record opacity 1 as their end value.
        gsap.set('[data-intro]', { opacity: 1 })
        const split = SplitText.create('[data-hero-title]', { type: 'lines', mask: 'lines' })
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
        tl.from(split.lines, { yPercent: 110, duration: 1.2, stagger: 0.09 }, 0.1)
          .from('[data-intro-item]', { opacity: 0, y: 18, duration: 1, stagger: 0.08 }, 0.35)
          .from('[data-intro-diagram]', { opacity: 0, scale: 0.97, duration: 1.4 }, 0.2)
        return () => split.revert()
      })

      // Desktop: pin the hero and let scrolling put the operation in order.
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const hint = hintRef.current
        gsap.to(state, {
          p: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=90%',
            pin: true,
            scrub: 0.8,
            onUpdate: (self) => {
              if (hint) hint.style.opacity = String(Math.max(0, 1 - self.progress * 5))
            },
          },
        })
      })

      // Smaller screens: no pinning, the diagram orders itself once visible.
      mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.to(state, {
          p: 1,
          duration: 2.8,
          ease: 'power2.inOut',
          delay: 0.6,
          scrollTrigger: { trigger: '[data-intro-diagram]', start: 'top 70%', once: true },
        })
      })

      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  const diagramLabels = {
    title: t('diagram.title'),
    before: t('diagram.before'),
    after: t('diagram.after'),
    order: t('diagram.order'),
    columns: t.raw('diagram.columns') as string[],
    nodes: t.raw('diagram.nodes'),
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden pt-[72px]">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_80%_70%_at_60%_45%,#000_30%,transparent_80%)]"
      />

      <div className="container-x relative grid min-h-[calc(100svh-72px)] items-center gap-12 py-12 lg:grid-cols-12 lg:gap-10 lg:py-10">
        <div className="lg:col-span-6 xl:pr-6">
          <div data-intro data-intro-item>
            <p className="eyebrow">{t('eyebrow')}</p>
            <p className="mt-2 pl-9 font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">
              {t('location')} <span className="ml-2 text-gold">{t('coords')}</span>
            </p>
          </div>

          <h1
            data-intro
            data-hero-title
            className="h-display mt-6 text-[clamp(2.5rem,1.3rem+3vw,3.9rem)] text-ink"
          >
            {t('title')}
          </h1>

          <p data-intro data-intro-item className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            {t('lead')}
          </p>

          <div data-intro data-intro-item className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic>
              <a href={whatsappLink(tw('diagnosis'))} target="_blank" rel="noopener" className="btn btn-primary">
                {t('ctaPrimary')}
                <ArrowRight className="btn-arrow size-4" />
              </a>
            </Magnetic>
            <a href="#servicios" className="btn btn-ghost">
              {t('ctaSecondary')}
            </a>
          </div>

          <p data-intro data-intro-item className="mt-5 font-mono text-[11px] tracking-[0.04em] text-ink-mute">
            {t('note')}
          </p>
        </div>

        <div data-intro data-intro-diagram className="lg:col-span-6">
          <HeroDiagram ref={diagramRef} labels={diagramLabels} />
        </div>
      </div>

      <div
        ref={hintRef}
        aria-hidden
        className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">{t('scrollHint')}</span>
        <span className="relative h-10 w-px overflow-hidden bg-line">
          <span className="scroll-hint-line absolute inset-0 bg-gold" />
        </span>
      </div>
    </section>
  )
}
