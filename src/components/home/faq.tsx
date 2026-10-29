import { getLocale, getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { getFaqs } from '@/lib/content'
import { whatsappLink } from '@/lib/site'
import { WhatsApp } from '@/components/ui/icons'

export async function FaqSection() {
  const t = await getTranslations('faq')
  const locale = (await getLocale()) as Locale
  const faqs = await getFaqs()

  return (
    <section className="border-t border-line py-24 md:py-36" aria-labelledby="faq-title">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <h2 id="faq-title" className="h-section text-ink" data-reveal>
              {t('title')}
            </h2>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-ink-soft" data-reveal data-reveal-delay="0.06">
              {t('lead')}
            </p>
            <a
              href={whatsappLink(t('askMessage'))}
              target="_blank"
              rel="noopener"
              className="btn btn-ghost mt-8"
              data-reveal
              data-reveal-delay="0.1"
            >
              <WhatsApp className="size-4" />
              {t('ask')}
            </a>
          </div>
        </div>

        <div className="lg:col-span-7">
          {faqs.map((f, i) => (
            <details
              key={f.q.es}
              name="faq"
              open={i === 0}
              className="faq group border-b border-line first:border-t"
              data-reveal
              data-reveal-delay={i * 0.04}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-semibold text-ink transition-colors hover:text-accent md:text-xl [&::-webkit-details-marker]:hidden">
                {f.q[locale]}
                <span
                  aria-hidden
                  className="relative grid size-9 shrink-0 place-items-center rounded-full border border-line-strong transition-[transform,background-color,border-color] duration-500 ease-[var(--ease-precise)] group-open:rotate-45 group-open:border-accent group-open:bg-accent"
                >
                  <span className="absolute h-px w-3.5 bg-ink group-open:bg-accent-ink" />
                  <span className="absolute h-3.5 w-px bg-ink group-open:bg-accent-ink" />
                </span>
              </summary>
              <p className="max-w-2xl pb-7 leading-relaxed text-ink-soft">{f.a[locale]}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
