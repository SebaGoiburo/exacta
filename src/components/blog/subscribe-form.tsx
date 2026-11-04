'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ArrowRight } from '@/components/ui/icons'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/** Blog subscription. The person only starts getting articles after confirming by email. */
export function SubscribeForm() {
  const t = useTranslations('subscribe')
  const locale = useLocale()
  const [status, setStatus] = useState<Status>('idle')
  const [problem, setProblem] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setProblem('')
    setStatus('sending')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          website: data.website,
          consent: data.consent === 'on',
          locale,
          page: window.location.pathname,
        }),
      })
      if (res.status === 422) {
        const { error } = (await res.json()) as { error?: string }
        setProblem(error === 'consent' ? t('consentRequired') : t('invalidEmail'))
        setStatus('idle')
        return
      }
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="bg-surface p-7 md:p-12" aria-labelledby="subscribe-title">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-5">
          <h2 id="subscribe-title" className="text-[clamp(1.6rem,1.2rem+1.6vw,2.5rem)] font-semibold leading-tight tracking-[-0.025em] text-ink">
            {t('title')}
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">{t('lead')}</p>
        </div>

        <div className="lg:col-span-7">
          {status === 'sent' ? (
            <p role="status" className="border-l-2 border-gold pl-5 text-lg font-medium text-ink">
              {t('sent')}
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              {/* Honeypot: real people never see or fill this field. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <label htmlFor="subscribe-email" className="text-sm font-semibold text-ink">
                {t('email')}
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="subscribe-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  className="min-w-0 flex-1 rounded-none border-0 border-b border-line-strong bg-transparent px-0 py-3 text-lg text-ink transition-colors focus:border-accent focus:outline-none focus:ring-0"
                />
                <button type="submit" disabled={status === 'sending'} className="btn btn-primary shrink-0 disabled:opacity-60">
                  {status === 'sending' ? t('sending') : t('submit')}
                  <ArrowRight className="btn-arrow size-4" />
                </button>
              </div>
              <label className="mt-4 flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                <input type="checkbox" name="consent" className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
                <span>
                  {t.rich('consent', {
                    link: (chunks) => (
                      <Link href="/privacidad" className="underline underline-offset-2 hover:text-accent">
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
              </label>
              {(problem || status === 'error') && (
                <p role="alert" className="mt-3 text-sm font-medium text-accent">
                  {problem || t('error')}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
