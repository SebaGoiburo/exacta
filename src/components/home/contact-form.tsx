'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight } from '@/components/ui/icons'

type Status = 'idle' | 'sending' | 'success' | 'error'
type Errors = Partial<Record<'name' | 'email' | 'phone', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fieldClass =
  'mt-2 w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 py-3 text-lg text-ink placeholder:text-ink-mute transition-colors focus:border-accent focus:outline-none focus:ring-0 aria-[invalid=true]:border-[#ff7a7a]'

export function ContactForm() {
  const t = useTranslations('contact.form')
  const locale = useLocale()
  const interests = t.raw('interests') as string[]
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<Errors>({})

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>

    const next: Errors = {}
    if (!data.name?.trim()) next.name = t('required')
    if (!data.email?.trim()) next.email = t('required')
    else if (!EMAIL_RE.test(data.email.trim())) next.email = t('invalidEmail')
    if (!data.phone?.trim()) next.phone = t('required')
    setErrors(next)
    if (Object.keys(next).length) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, locale, source: 'web-contacto', page: window.location.pathname }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('success')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div role="status" className="flex min-h-[420px] flex-col justify-center border-l-2 border-gold pl-8">
        <p className="font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink">{t('success')}</p>
      </div>
    )
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`err-${k}`} className="mt-2 text-sm text-[#ff9a9a]">
        {errors[k]}
      </p>
    ) : null

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 sm:grid-cols-2">
      {/* Honeypot: real people never see or fill this field. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="cf-name" className="text-sm font-semibold text-ink">
          {t('name')}
        </label>
        <input
          id="cf-name"
          name="name"
          autoComplete="name"
          className={fieldClass}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'err-name' : undefined}
        />
        {err('name')}
      </div>

      <div>
        <label htmlFor="cf-email" className="text-sm font-semibold text-ink">
          {t('email')}
        </label>
        <input
          id="cf-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={fieldClass}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'err-email' : undefined}
        />
        {err('email')}
      </div>

      <div>
        <label htmlFor="cf-phone" className="text-sm font-semibold text-ink">
          {t('phone')}
        </label>
        <input
          id="cf-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          className={fieldClass}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'err-phone' : undefined}
        />
        {err('phone')}
      </div>

      <div>
        <label htmlFor="cf-company" className="text-sm font-semibold text-ink">
          {t('company')} <span className="font-normal text-ink-mute">({t('optional')})</span>
        </label>
        <input id="cf-company" name="company" autoComplete="organization" className={fieldClass} />
      </div>

      <div>
        <label htmlFor="cf-interest" className="text-sm font-semibold text-ink">
          {t('interest')}
        </label>
        <select id="cf-interest" name="interest" defaultValue={interests[interests.length - 1]} className={`${fieldClass} cursor-pointer [&>option]:bg-bg`}>
          {interests.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="cf-message" className="text-sm font-semibold text-ink">
          {t('message')} <span className="font-normal text-ink-mute">({t('optional')})</span>
        </label>
        <textarea id="cf-message" name="message" rows={3} className={`${fieldClass} resize-none`} />
      </div>

      <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
        <button type="submit" disabled={status === 'sending'} className="btn btn-primary disabled:opacity-60">
          {status === 'sending' ? t('sending') : t('submit')}
          <ArrowRight className="btn-arrow size-4" />
        </button>
        {status === 'error' && (
          <p role="alert" className="text-sm text-[#ff9a9a]">
            {t('error')}
          </p>
        )}
      </div>
    </form>
  )
}
