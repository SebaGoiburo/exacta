'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { getAttribution, track } from '@/lib/analytics'
import { ArrowRight } from '@/components/ui/icons'

export type ClientQuestion = { id: string; title: string; options: { id: string; label: string }[] }

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'company' | 'consent', string>>

const STORAGE_KEY = 'exacta-diagnostic'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADVANCE_MS = 240

const fieldClass =
  'mt-2 w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 py-3 text-lg text-ink placeholder:text-ink-mute transition-colors focus:border-accent focus:outline-none focus:ring-0 aria-[invalid=true]:border-[#d9534f]'

function loadAnswers(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveAnswers(answers: Record<string, string> | null) {
  try {
    if (answers) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Answers just won't survive a reload.
  }
}

/** Questions one at a time, then the contact gate. The weights and scoring live only on the server. */
export function DiagnosticApp({ questions, areas }: { questions: ClientQuestion[]; areas: string[] }) {
  const t = useTranslations('diagnostic')
  const locale = useLocale()
  const router = useRouter()
  const total = questions.length

  // -1 is the intro, `total` is the contact gate.
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [picked, setPicked] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  const question = step >= 0 && step < total ? questions[step] : null

  useEffect(() => {
    setAnswers(loadAnswers())
  }, [])

  // Moves focus and scroll with each step, so keyboards and screen readers follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  function start() {
    track('diagnostic_start')
    const firstOpen = questions.findIndex((q) => !answers[q.id])
    setStep(firstOpen === -1 ? total : firstOpen)
  }

  function choose(optionId: string) {
    if (!question || picked) return
    const next = { ...answers, [question.id]: optionId }
    setAnswers(next)
    saveAnswers(next)
    setPicked(optionId)
    // A short pause so the choice registers before moving on.
    window.setTimeout(() => {
      setPicked(null)
      setStep((s) => s + 1)
    }, ADVANCE_MS)
  }

  // Number keys answer the current question.
  useEffect(() => {
    if (!question) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const option = question.options[Number(e.key) - 1]
      if (option) choose(option.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, picked, answers])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    const g = (key: string) => t(`gate.${key}`)

    const next: Errors = {}
    if (!data.name?.trim()) next.name = g('required')
    if (!data.email?.trim()) next.email = g('required')
    else if (!EMAIL_RE.test(data.email.trim())) next.email = g('invalidEmail')
    if (!data.phone?.trim()) next.phone = g('required')
    if (!data.company?.trim()) next.company = g('required')
    if (!data.consent) next.consent = g('consentRequired')
    setErrors(next)
    if (Object.keys(next).length) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          consent: true,
          answers,
          locale,
          page: window.location.pathname,
          attribution: getAttribution(),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const { token, eventId } = (await res.json()) as { token: string; eventId?: string }
      track('lead', { kind: 'diagnostic' }, eventId)
      saveAnswers(null)
      router.push(`/diagnostico/resultado/${token}`)
    } catch {
      setStatus('error')
    }
  }

  const progress = step < 0 ? 0 : Math.round((Math.min(step, total) / total) * 100)

  if (step < 0) {
    return (
      <div className="container-x grid min-h-svh gap-14 pt-36 pb-24 lg:grid-cols-12 lg:items-center lg:pt-28">
        <div className="lg:col-span-7">
          <p className="eyebrow">{t('intro.eyebrow')}</p>
          <h1 className="h-display mt-6 text-[clamp(2.75rem,1.5rem+4.5vw,5.5rem)] text-ink">{t('intro.title')}</h1>
          <p className="mt-7 max-w-xl text-xl leading-relaxed text-ink-soft">{t('intro.lead')}</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <button type="button" onClick={start} className="btn btn-primary">
              {t('intro.start')}
              <ArrowRight className="btn-arrow size-4" />
            </button>
            <p className="font-mono text-[11px] tracking-[0.04em] text-ink-soft">{t('intro.note')}</p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="font-semibold text-ink">{t('intro.measures')}</p>
          <ul className="mt-5">
            {areas.map((area) => (
              <li key={area} className="border-t border-line py-4">
                <p className="text-ink-soft">{area}</p>
                <div className="ruler mt-2" aria-hidden />
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`derr-${k}`} className="mt-2 text-sm text-[#c9403b] dark:text-[#ff9a9a]">
        {errors[k]}
      </p>
    ) : null

  return (
    <div className="container-x min-h-svh pt-28 pb-24 md:pt-32">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4 font-mono text-[11px] tracking-[0.04em] text-ink-soft">
          <span>{question ? t('step', { n: step + 1, total }) : t('gate.step')}</span>
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-accent"
          >
            <ArrowRight className="size-3 rotate-180" />
            {t('back')}
          </button>
        </div>
        <div
          className="ruler mt-1"
          style={{ '--v': `${progress}%` } as React.CSSProperties}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={t('intro.eyebrow')}
        />

        {question ? (
          <div key={question.id} className="step-in mt-14 md:mt-20">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="h-display text-[clamp(1.875rem,1.3rem+2.4vw,3.25rem)] leading-[1.1] text-ink outline-none"
            >
              {question.title}
            </h1>
            <ul className="mt-10 border-b border-line md:mt-12">
              {question.options.map((option, i) => {
                const selected = picked ? picked === option.id : answers[question.id] === option.id
                return (
                  <li key={option.id} className="border-t border-line">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => choose(option.id)}
                      className={`group flex w-full items-center gap-5 py-5 text-left text-lg transition-[color,padding] duration-300 ease-[var(--ease-precise)] hover:pl-3 hover:text-accent md:text-xl ${
                        selected ? 'pl-3 text-accent' : 'text-ink'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`font-mono text-xs transition-colors group-hover:text-gold ${selected ? 'text-gold' : 'text-ink-soft'}`}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium">{option.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className="step-in mt-14 md:mt-20">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="h-display text-[clamp(2.25rem,1.5rem+3vw,4rem)] text-ink outline-none"
            >
              {t('gate.title')}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">{t('gate.lead')}</p>

            <form onSubmit={submit} noValidate className="mt-12 grid gap-8 sm:grid-cols-2">
              {/* Honeypot: real people never see or fill this field. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  URL
                  <input name="url" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              {(
                [
                  ['name', 'name', 'text'],
                  ['company', 'organization', 'text'],
                  ['email', 'email', 'email'],
                  ['phone', 'tel', 'tel'],
                ] as const
              ).map(([key, autoComplete, type]) => (
                <div key={key}>
                  <label htmlFor={`d-${key}`} className="text-sm font-semibold text-ink">
                    {t(`gate.${key}`)}
                  </label>
                  <input
                    id={`d-${key}`}
                    name={key}
                    type={type}
                    autoComplete={autoComplete}
                    className={fieldClass}
                    aria-invalid={!!errors[key]}
                    aria-describedby={errors[key] ? `derr-${key}` : undefined}
                  />
                  {err(key)}
                </div>
              ))}

              <div className="sm:col-span-2">
                <label htmlFor="d-website" className="text-sm font-semibold text-ink">
                  {t('gate.website')} <span className="font-normal text-ink-soft">({t('gate.optional')})</span>
                </label>
                <input id="d-website" name="website" autoComplete="url" className={fieldClass} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="d-message" className="text-sm font-semibold text-ink">
                  {t('gate.message')} <span className="font-normal text-ink-soft">({t('gate.optional')})</span>
                </label>
                <textarea id="d-message" name="message" rows={3} className={`${fieldClass} resize-none`} />
              </div>

              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft">
                  <input
                    name="consent"
                    type="checkbox"
                    value="1"
                    aria-invalid={!!errors.consent}
                    aria-describedby={errors.consent ? 'derr-consent' : undefined}
                    className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span>
                    {t.rich('gate.consent', {
                      link: (chunks) => (
                        <Link href="/privacidad" target="_blank" className="underline underline-offset-2 hover:text-accent">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </span>
                </label>
                {err('consent')}
              </div>

              <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
                <button type="submit" disabled={status === 'sending'} className="btn btn-primary disabled:opacity-60">
                  {status === 'sending' ? t('gate.sending') : t('gate.submit')}
                  <ArrowRight className="btn-arrow size-4" />
                </button>
                {status === 'error' && (
                  <p role="alert" className="text-sm text-[#c9403b] dark:text-[#ff9a9a]">
                    {t('gate.error')}
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
