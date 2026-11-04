import { useLocale, useTranslations } from 'next-intl'
import { landingPath, landingsOf } from '@/content/landings'
import { site, whatsappLink } from '@/lib/site'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Logo } from '@/components/brand/logo'
import { CookiePreferences } from '@/components/analytics/cookie-preferences'
import { Facebook, Instagram, LinkedIn, WhatsApp } from '@/components/ui/icons'

export function SiteFooter({ hasTracking = false }: { hasTracking?: boolean }) {
  const t = useTranslations('footer')
  const tw = useTranslations('whatsapp')
  const locale = useLocale() as Locale
  const year = new Date().getFullYear()

  const groups = [
    { title: t('solutions'), items: landingsOf('soluciones') },
    { title: t('industries'), items: landingsOf('industrias') },
  ]

  const socials = [
    { label: 'Instagram', href: site.social.instagram, Icon: Instagram },
    { label: 'LinkedIn', href: site.social.linkedin, Icon: LinkedIn },
    { label: 'Facebook', href: site.social.facebook, Icon: Facebook },
  ]

  return (
    <footer className="border-t border-line">
      <div className="container-x grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-3">
          <Logo className="h-8 w-auto text-ink" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">{t('tagline')}</p>
        </div>

        {groups.map((group) => (
          <div key={group.title} className="lg:col-span-3">
            <p className="eyebrow">{group.title}</p>
            <ul className="mt-5 space-y-3 text-sm">
              {group.items.map((item) => (
                <li key={item.slug}>
                  <Link href={landingPath(item)} className="text-ink transition-colors hover:text-accent">
                    {item.name[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="lg:col-span-3">
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

        <div className="sm:col-span-2 lg:col-span-12">
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
            © {year} {site.legalName} · CUIT {site.cuit}. {t('rights')}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacidad" className="transition-colors hover:text-accent">
              {t('privacy')}
            </Link>
            {hasTracking && <CookiePreferences />}
            <p>{site.city}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
