'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { Moon, Sun } from '@/components/ui/icons'

export function ThemeToggle() {
  const t = useTranslations('nav')
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('toLight') : t('toDark')}
      title={isDark ? t('toLight') : t('toDark')}
      className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface hover:text-ink"
    >
      {/* Icons switch with CSS so they are right before hydration. */}
      <Sun className="hidden size-[18px] dark:block" />
      <Moon className="size-[18px] dark:hidden" />
    </button>
  )
}

export function LocaleSwitcher() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div role="group" aria-label={t('language')} className="flex items-center font-mono text-[11px] tracking-[0.08em]">
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="px-1 text-ink-mute">/</span>}
          <button
            type="button"
            lang={l}
            aria-current={l === locale ? 'true' : undefined}
            onClick={() => router.replace(pathname, { locale: l })}
            className={`rounded px-1 py-1 uppercase transition-colors ${
              l === locale ? 'text-ink' : 'text-ink-mute hover:text-ink'
            }`}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  )
}
