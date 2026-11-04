'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { manualCost } from '@/lib/manual-cost'
import { ArrowRight } from '@/components/ui/icons'

/** Hours a month where the ruler fills up: five people working full time. */
const RULER_MAX_HOURS = 800

function Slider({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-semibold text-ink">
          {label}
        </label>
        <output htmlFor={id} className="font-display text-2xl font-semibold text-gold tabular-nums">
          {value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-9 w-full cursor-pointer accent-[var(--accent)]"
      />
    </div>
  )
}

/** The page's one live thing: the visitor's own numbers read on the site's ruler. */
export function ManualCostCalculator({ task }: { task: string }) {
  const t = useTranslations('landing.calc')
  const locale = useLocale()
  const [hours, setHours] = useState(10)
  const [people, setPeople] = useState(2)
  const [rate, setRate] = useState('')

  const hourlyCost = Number(rate.replace(',', '.'))
  const result = manualCost({ hoursPerWeek: hours, people, hourlyCost })
  const number = (n: number) => n.toLocaleString(locale)

  return (
    <section className="border-t border-line py-24 md:py-32" aria-labelledby="calc-title">
      <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 id="calc-title" className="h-section text-ink" data-reveal>
            {t('title')}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft" data-reveal data-reveal-delay="0.06">
            {t('lead', { task })}
          </p>
          <div className="mt-10 grid gap-7" data-reveal data-reveal-delay="0.1">
            <Slider id="calc-hours" label={t('hours')} value={hours} min={1} max={40} onChange={setHours} />
            <Slider id="calc-people" label={t('people')} value={people} min={1} max={25} onChange={setPeople} />
            <div>
              <label htmlFor="calc-rate" className="font-semibold text-ink">
                {t('rate')} <span className="font-normal text-ink-mute">({t('optional')})</span>
              </label>
              <input
                id="calc-rate"
                inputMode="decimal"
                autoComplete="off"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="mt-2 w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 py-3 text-lg text-ink transition-colors focus:border-accent focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7" data-reveal data-reveal-delay="0.12">
          <div className="border border-line bg-bg-elev p-7 md:p-12" aria-live="polite">
            <p className="h-display text-[clamp(4.5rem,3rem+8vw,10rem)] leading-[0.9] text-gold tabular-nums">
              {number(result.hoursPerMonth)}
            </p>
            <p className="mt-4 text-xl font-medium text-ink">{t('reading')}</p>
            <div
              aria-hidden
              className="ruler mt-8"
              style={{ '--v': `${Math.min(100, (result.hoursPerMonth / RULER_MAX_HOURS) * 100)}%` } as React.CSSProperties}
            />
            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-ink-soft">{t('workdays')}</dt>
                <dd className="mt-1 font-display text-3xl font-semibold text-ink tabular-nums">{number(result.workdays)}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">{t('fullTime')}</dt>
                <dd className="mt-1 font-display text-3xl font-semibold text-ink tabular-nums">{number(result.fullTimePeople)}</dd>
              </div>
              {result.costPerMonth > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-ink-soft">{t('cost')}</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink tabular-nums">{number(result.costPerMonth)}</dd>
                </div>
              )}
            </dl>
            <p className="mt-8 leading-relaxed text-ink-soft">{t('note')}</p>
            <Link href="/diagnostico" className="btn btn-primary mt-8">
              {t('cta')}
              <ArrowRight className="btn-arrow size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
