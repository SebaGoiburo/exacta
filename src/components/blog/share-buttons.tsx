import { useLocale, useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/routing'
import { localePath } from '@/lib/seo'
import { shareLinks, type ShareLink } from '@/lib/share'
import { site } from '@/lib/site'
import { Facebook, LinkedIn, Mail, WhatsApp, XLogo } from '@/components/ui/icons'

const ICONS: Record<ShareLink['network'], typeof Mail> = {
  linkedin: LinkedIn,
  whatsapp: WhatsApp,
  x: XLogo,
  facebook: Facebook,
  email: Mail,
}

/** Sits on top of a card's stretched link, so it stays clickable on its own. */
export function ShareButtons({ slug, title, excerpt }: { slug: string; title: string; excerpt?: string }) {
  const t = useTranslations('blog.share')
  const locale = useLocale() as Locale
  const url = `${process.env.NEXT_PUBLIC_SERVER_URL || site.url}${localePath(locale, `/blog/${slug}`)}`

  return (
    <div className="relative z-10 flex flex-wrap items-center gap-1.5">
      <span className="mr-1.5 text-sm text-ink-soft">{t('label')}</span>
      {shareLinks(url, title, excerpt).map(({ network, href }) => {
        const Icon = ICONS[network]
        const external = network !== 'email'
        return (
          <a
            key={network}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener' } : {})}
            aria-label={t(network, { title })}
            className="grid size-11 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-accent hover:text-accent md:size-9"
          >
            <Icon className="size-4" />
          </a>
        )
      })}
    </div>
  )
}
