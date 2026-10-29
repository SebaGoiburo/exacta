import { getTranslations } from 'next-intl/server'
import { site, whatsappLink } from '@/lib/site'
import { WhatsApp } from '@/components/ui/icons'
import { ContactForm } from './contact-form'

/** Closing section. Always rendered on the dark field, in both themes. */
export async function Contact() {
  const t = await getTranslations('contact')
  const tw = await getTranslations('whatsapp')

  return (
    <section id="contacto" data-theme="dark" className="scroll-mt-0 bg-bg py-24 text-ink md:py-36" aria-labelledby="contact-title">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <h2 id="contact-title" className="h-section text-ink" data-reveal>
            {t('title')}
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft" data-reveal data-reveal-delay="0.06">
            {t('lead')}
          </p>

          <div className="mt-12 border-t border-line pt-8" data-reveal data-reveal-delay="0.1">
            <p className="font-semibold text-ink">{t('direct')}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={whatsappLink(tw('diagnosis'))} target="_blank" rel="noopener" className="btn btn-primary">
                <WhatsApp className="size-4" />
                {site.phoneDisplay}
              </a>
              <a href={`mailto:${site.email}`} className="btn btn-ghost max-w-full truncate">
                {site.email}
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6" data-reveal data-reveal-delay="0.12">
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
