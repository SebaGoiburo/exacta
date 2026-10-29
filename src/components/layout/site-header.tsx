'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { whatsappLink } from '@/lib/site'
import { Logo } from '@/components/brand/logo'
import { Magnetic } from '@/components/motion/magnetic'
import { ArrowRight } from '@/components/ui/icons'
import { LocaleSwitcher, ThemeToggle } from './header-controls'

const NAV = [
  { key: 'services', href: '/#servicios' },
  { key: 'method', href: '/#metodo' },
  { key: 'cases', href: '/#casos' },
  { key: 'products', href: '/#productos' },
  { key: 'team', href: '/#equipo' },
  { key: 'blog', href: '/blog' },
] as const

export function SiteHeader() {
  const t = useTranslations('nav')
  const tw = useTranslations('whatsapp')
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      // Hide while scrolling down, show again on any upward scroll.
      setHidden(y > 320 && y > last + 4)
      if (y < last - 4 || y <= 320) setHidden(false)
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color] duration-500 ease-[var(--ease-precise)] ${
        hidden && !open ? '-translate-y-full' : 'translate-y-0'
      } ${
        scrolled || open
          ? 'border-b border-line bg-[var(--header-bg)] backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <div className="container-x flex h-[72px] items-center justify-between gap-6">
        <Link href="/" aria-label={t('home')} className="shrink-0 text-ink" onClick={() => setOpen(false)}>
          <Logo className="h-7 w-auto md:h-8" />
        </Link>

        <nav aria-label={t('label')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group relative rounded-full px-3.5 py-2 text-[0.9rem] font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  {t(item.key)}
                  <span className="absolute inset-x-3.5 bottom-1 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-precise)] group-hover:scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <div className="hidden md:block">
            <Magnetic>
              <a href={whatsappLink(tw('diagnosis'))} target="_blank" rel="noopener" className="btn btn-primary btn-sm">
                {t('cta')}
                <ArrowRight className="btn-arrow size-3.5" />
              </a>
            </Magnetic>
          </div>
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-full text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t('closeMenu') : t('openMenu')}
            onClick={() => setOpen((v) => !v)}
          >
            <span
              className={`absolute h-px w-5 bg-current transition-transform duration-300 ${open ? 'rotate-45' : '-translate-y-[4px]'}`}
            />
            <span
              className={`absolute h-px w-5 bg-current transition-transform duration-300 ${open ? '-rotate-45' : 'translate-y-[4px]'}`}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100svh-72px)] overflow-y-auto border-t border-line bg-bg lg:hidden"
      >
        <nav aria-label={t('label')} className="container-x flex h-full flex-col justify-between py-8">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.key} className="border-b border-line">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-4 font-display text-3xl font-semibold tracking-tight text-ink"
                >
                  {t(item.key)}
                  <ArrowRight className="size-5 text-ink-mute" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
            <a href={whatsappLink(tw('diagnosis'))} target="_blank" rel="noopener" className="btn btn-primary w-full">
              {t('cta')}
              <ArrowRight className="btn-arrow size-3.5" />
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
