'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import type { CaseStudy } from '@/content/types'
import type { Locale } from '@/i18n/routing'
import { ArrowRight } from '@/components/ui/icons'

export function CasesSlider({ cases }: { cases: CaseStudy[] }) {
  const t = useTranslations('cases')
  const locale = useLocale() as Locale
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const total = cases.length

  const goTo = useCallback((i: number) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(total - 1, i))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
  }, [total])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => setIndex(Math.round(track.scrollLeft / track.clientWidth))
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goTo(index + 1)
    if (e.key === 'ArrowLeft') goTo(index - 1)
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label={t('title')} onKeyDown={onKey}>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cases.map((c, i) => (
          <article
            key={c.slug}
            role="group"
            aria-roledescription="slide"
            aria-label={t('slide', { current: i + 1, total })}
            aria-hidden={i !== index || undefined}
            inert={i !== index || undefined}
            className="w-full shrink-0 snap-start"
          >
            <Slide c={c} locale={locale} labels={{ challenge: t('challenge'), solution: t('solution'), placeholder: t('placeholder') }} />
          </article>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between gap-6">
        <div className="flex flex-1 items-center gap-4">
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-mute tabular-nums" aria-live="polite">
            <span className="text-gold">{String(index + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
          </span>
          <div className="relative h-px max-w-xs flex-1 bg-line-strong" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 bg-gold transition-[width] duration-500 ease-[var(--ease-precise)]"
              style={{ width: `${((index + 1) / total) * 100}%`, height: 2, top: -0.5 }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label={t('prev')}
            className="grid size-12 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:pointer-events-none disabled:opacity-35"
          >
            <ArrowRight className="size-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === total - 1}
            aria-label={t('next')}
            className="grid size-12 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:pointer-events-none disabled:opacity-35"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Slide({
  c,
  locale,
  labels,
}: {
  c: CaseStudy
  locale: Locale
  labels: { challenge: string; solution: string; placeholder: string }
}) {
  const muted = c.placeholder ? 'text-ink-mute' : ''

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      {/* Media: client photo with the before/after metric */}
      <div className="relative flex aspect-[4/5] max-h-[620px] w-full flex-col justify-between overflow-hidden bg-surface p-6 sm:aspect-[5/4] md:p-8 lg:col-span-5 lg:aspect-auto lg:min-h-[560px]">
        {c.image ? (
          <Image
            src={c.image}
            alt={c.client}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-contain object-bottom"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center" aria-hidden>
            <span className="font-display text-[9rem] font-semibold leading-none tracking-[-0.05em] text-line-strong">
              {c.client.replace(/\D/g, '').padStart(2, '0')}
            </span>
          </div>
        )}
        <p className="relative font-mono text-[11px] tracking-[0.06em] text-ink-soft">
          {c.placeholder ? labels.placeholder : c.role[locale]}
        </p>
        <div className="relative self-start bg-bg/90 px-5 py-4 backdrop-blur-sm">
          <p className="flex items-baseline gap-3 font-display font-semibold tracking-[-0.03em] tabular-nums">
            <span className="text-2xl text-ink-mute line-through decoration-1">{c.metric.before[locale]}</span>
            <ArrowRight className="size-4 self-center text-ink-mute" />
            <span className="text-4xl text-gold md:text-5xl">{c.metric.after[locale]}</span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">{c.metric.label[locale]}</p>
        </div>
      </div>

      {/* Story */}
      <div className="flex flex-col lg:col-span-7 lg:py-4">
        <h3 className={`text-[clamp(1.75rem,1.2rem+2vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink ${muted}`}>
          {c.client}
        </h3>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-accent">{labels.challenge}</p>
            <p className={`mt-3 leading-relaxed text-ink ${muted}`}>{c.challenge[locale]}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-accent">{labels.solution}</p>
            <p className={`mt-3 leading-relaxed text-ink ${muted}`}>{c.solution[locale]}</p>
          </div>
        </div>

        {c.quote && (
          <blockquote className="mt-auto border-l-2 border-gold pt-10 pl-6 lg:pt-0">
            <p className="font-display text-xl font-medium leading-snug tracking-[-0.015em] text-ink md:text-2xl">
              “{c.quote[locale]}”
            </p>
            <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
              <span>
                {c.client} · {c.role[locale]}
              </span>
              {c.links?.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener" className="text-accent underline-offset-4 hover:underline">
                  {l.label}
                </a>
              ))}
            </footer>
          </blockquote>
        )}
      </div>
    </div>
  )
}
