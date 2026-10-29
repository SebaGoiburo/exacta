import { useTranslations } from 'next-intl'
import { RegMarks, SpotlightGroup } from '@/components/motion/spotlight'
import { ScrubText } from '@/components/motion/scrub-text'

type Item = { cost: string; title: string; body: string }

export function PainPoints() {
  const t = useTranslations('pain')
  const items = t.raw('items') as Item[]

  return (
    <section className="py-24 md:py-36" aria-labelledby="pain-title">
      <div className="container-x">
        <div className="max-w-4xl">
          <p className="eyebrow" data-reveal>
            {t('eyebrow')}
          </p>
          <h2 id="pain-title" className="h-section mt-5 text-ink" data-reveal>
            {t('title')}
          </h2>
        </div>

        <SpotlightGroup className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
          {items.map((item, i) => (
            <article
              key={item.title}
              className="reg-card flex min-h-[240px] flex-col p-7 md:p-9"
              data-reveal
              data-reveal-delay={(i % 2) * 0.08}
            >
              <RegMarks />
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                {t('costLabel')}: <span className="text-gold">{item.cost}</span>
              </p>
              <h3 className="mt-auto pt-10 text-2xl font-semibold tracking-[-0.02em] text-ink md:text-[1.75rem]">
                {item.title}
              </h3>
              <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{item.body}</p>
            </article>
          ))}
        </SpotlightGroup>

        <ScrubText
          className="mt-24 max-w-4xl font-display text-[clamp(1.5rem,1rem+1.8vw,2.25rem)] font-medium leading-[1.2] tracking-[-0.025em] text-ink md:mt-32"
          parts={[
            { text: t('statementA') },
            { text: t('statementEmph'), emphasis: true },
            { text: t('statementB') },
          ]}
        />
      </div>
    </section>
  )
}
