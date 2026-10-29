import { useTranslations } from 'next-intl'
import { site, whatsappLink } from '@/lib/site'
import { Logo } from '@/components/brand/logo'
import { Facebook, Instagram, LinkedIn, WhatsApp } from '@/components/ui/icons'

export function SiteFooter() {
  const t = useTranslations('footer')
  const tw = useTranslations('whatsapp')
  const year = new Date().getFullYear()

  const socials = [
    { label: 'Instagram', href: site.social.instagram, Icon: Instagram },
    { label: 'LinkedIn', href: site.social.linkedin, Icon: LinkedIn },
    { label: 'Facebook', href: site.social.facebook, Icon: Facebook },
  ]

  return (
    <footer className="border-t border-line">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo className="h-8 w-auto text-ink" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">{t('tagline')}</p>
        </div>

        <div className="md:col-span-4">
          <p className="eyebrow">{t('contact')}</p>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <a
                href={whatsappLink(tw('diagnosis'))}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 text-ink transition-colors hover:text-accent"
              >
                <WhatsApp className="size-4" />
                {site.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="break-all text-ink transition-colors hover:text-accent">
                {site.email}
              </a>
            </li>
            <li className="text-ink-soft">{site.city}</li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <p className="eyebrow">{t('follow')}</p>
          <ul className="mt-5 flex gap-2">
            {socials.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener"
                  aria-label={label}
                  className="grid size-10 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-6 font-mono text-[11px] tracking-[0.06em] text-ink-mute sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Exacta. {t('rights')}
          </p>
          <p>{site.city}</p>
        </div>
      </div>
    </footer>
  )
}
