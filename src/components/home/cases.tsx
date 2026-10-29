import { getTranslations } from 'next-intl/server'
import { getCases } from '@/lib/content'
import { CasesSlider } from './cases-slider'

export async function Cases() {
  const t = await getTranslations('cases')
  const cases = await getCases()

  return (
    <section id="casos" className="scroll-mt-20 border-t border-line py-24 md:py-36" aria-labelledby="cases-title">
      <div className="container-x">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 id="cases-title" className="h-section text-ink" data-reveal>
            {t('title')}
          </h2>
          <p className="max-w-sm text-lg leading-relaxed text-ink-soft" data-reveal data-reveal-delay="0.08">
            {t('lead')}
          </p>
        </div>
        <div data-reveal>
          <CasesSlider cases={cases} />
        </div>
      </div>
    </section>
  )
}
