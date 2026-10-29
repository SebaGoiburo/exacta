import { useTranslations } from 'next-intl'
import { whatsappLink } from '@/lib/site'
import { ArrowRight } from '@/components/ui/icons'

type Item = { title: string; body: string; tags: string[] }

export function Services() {
  const t = useTranslations('services')
  const tw = useTranslations('whatsapp')
  const items = t.raw('items') as Item[]

  return (
    <section id="servicios" className="scroll-mt-20 border-t border-line py-24 md:py-36" aria-labelledby="services-title">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow" data-reveal>
              {t('eyebrow')}
            </p>
            <h2 id="services-title" className="h-section mt-5 text-ink" data-reveal>
              {t('title')}
            </h2>
          </div>
          <p className="leading-relaxed text-ink-soft lg:col-span-4" data-reveal>
            {t('lead')}
          </p>
        </div>

        <ul className="mt-16 border-t border-line">
          {items.map((item) => (
            <li key={item.title} className="border-b border-line" data-reveal>
              <a
                href={whatsappLink(tw('service', { service: item.title }))}
                target="_blank"
                rel="noopener"
                className="svc-row group grid gap-4 px-1 py-8 md:grid-cols-12 md:items-start md:gap-8 md:px-4 md:py-10"
              >
                <div className="md:col-span-7">
                  <h3 className="text-[clamp(1.5rem,1.1rem+1.6vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
                    {item.title}
                  </h3>
                  <div className="svc-body">
                    <div>
                      <p className="max-w-xl pt-4 leading-relaxed text-ink-soft">{item.body}</p>
                    </div>
                  </div>
                </div>
                <ul className="flex flex-wrap gap-2 md:col-span-4 md:justify-end md:pt-2">
                  {item.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-line px-3 py-1.5 font-mono text-[10.5px] tracking-[0.04em] text-ink-soft"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <div className="hidden md:col-span-1 md:flex md:justify-end">
                  <span className="svc-arrow grid size-11 place-items-center rounded-full border border-line-strong text-ink">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
                <span className="sr-only">{t('more')}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
