import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { AREAS, type Area } from '@/lib/diagnostic/questions'
import { AREA_NAMES } from '@/lib/diagnostic/recommendations'
import { cms, type ReportContent } from '@/lib/prospecting/service'
import { getSettings } from '@/lib/settings'
import { whatsappLink } from '@/lib/site'
import { ArrowRight, WhatsApp } from '@/components/ui/icons'
import { OpenBeacon } from '@/components/report/open-beacon'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; token: string }> }

const TOKEN = /^[A-Za-z0-9_-]{10,40}$/

async function getReport(token: string) {
  if (!TOKEN.test(token)) return null
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'prospects',
    where: { and: [{ reportToken: { equals: token } }, { reportReviewedAt: { exists: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const prospect = docs[0]
  if (!prospect?.report) return null
  return {
    report: prospect.report as unknown as ReportContent,
    expiresAt: prospect.reportExpiresAt ? new Date(prospect.reportExpiresAt) : null,
  }
}

export async function generateMetadata(): Promise<Metadata> {
  // Private to its recipient: reachable only through its link and never indexed.
  return { title: 'Informe', robots: { index: false, follow: false } }
}

const dateText = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

function sourceText(source: string, date: string) {
  if (source === 'google_maps') return `Fuente: Google Maps, consultado el ${dateText(date)}`
  if (source === 'sitio') return `Fuente: revisión de su sitio web, ${dateText(date)}`
  if (source === 'pagespeed') return `Fuente: Google PageSpeed para celulares, ${dateText(date)}`
  return source ? 'Fuente: ' : ''
}

export default async function ProspectReport({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }
  setRequestLocale(locale)

  const found = await getReport(token)
  if (!found) notFound()
  const { report, expiresAt } = found
  const expired = !expiresAt || expiresAt.getTime() < Date.now()
  const whatsapp = whatsappLink(`Hola, soy de ${report.company}. Leí el informe que nos mandaron y me gustaría ver el resto.`)

  if (expired) {
    return (
      <div className="container-x pt-36 pb-28 md:pt-44">
        <p className="eyebrow">Informe para {report.company}</p>
        <h1 className="h-display mt-6 text-[clamp(2rem,1.5rem+2.5vw,3.5rem)] text-ink">Este informe ya venció</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Los datos que usamos cambian con el tiempo, así que cada informe vale 30 días. Si querés, lo actualizamos y te lo
          mostramos en una conversación corta.
        </p>
        <a href={whatsapp} target="_blank" rel="noopener" className="btn btn-primary mt-9">
          <WhatsApp className="size-4" />
          Pedir el informe actualizado
        </a>
      </div>
    )
  }

  const settings = await getSettings()
  const areas = report.areas as Record<Area, number> | null

  return (
    <div className="container-x pt-36 pb-28 md:pt-44">
      <OpenBeacon token={token} />

      <header className="max-w-3xl">
        <p className="eyebrow">Informe para {report.company}</p>
        <h1 className="h-display mt-6 text-[clamp(2.25rem,1.5rem+3vw,4.25rem)] text-ink">{report.headline}</h1>
        {report.intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">{report.intro}</p>}
      </header>

      {report.findings.length > 0 && (
        <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="findings-title">
          <h2 id="findings-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Lo que encontramos
          </h2>
          <ol className="mt-8 grid gap-10 md:grid-cols-3">
            {report.findings.map((f, i) => (
              <li key={i} className="border-t-2 border-gold pt-5">
                <p className="font-mono text-sm text-gold">0{i + 1}</p>
                <p className="mt-2 font-semibold text-ink">{f.title}</p>
                <p className="mt-3 leading-relaxed text-ink-soft">{f.detail}</p>
                {f.impact && (
                  <p className="mt-3 leading-relaxed text-ink">
                    <span className="font-semibold">Por qué importa: </span>
                    {f.impact}
                  </p>
                )}
                <p className="mt-4 text-sm text-ink-soft">
                  {sourceText(f.source, report.date)}
                  {/^https?:\/\//.test(f.source) && (
                    <a href={f.source} target="_blank" rel="noopener nofollow" className="underline">
                      {new URL(f.source).hostname}
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {report.comparison && (
        <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="comparison-title">
          <h2 id="comparison-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Frente a los primeros de tu zona
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">{report.comparison}</p>
        </section>
      )}

      {areas && (
        <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="areas-title">
          <h2 id="areas-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Madurez digital vista desde afuera
          </h2>
          <p className="mt-4 max-w-2xl text-ink-soft">
            Es una estimación con lo que se ve públicamente. Lo de adentro (procesos, sistemas, datos) solo lo podés contar vos.
          </p>
          <ul className="mt-8 grid gap-x-16 gap-y-8 md:grid-cols-2">
            {AREAS.map((area) => (
              <li key={area}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-ink">{AREA_NAMES[area].es}</span>
                  <span className="font-mono text-sm text-gold">{areas[area]}</span>
                </div>
                <div className="ruler ruler-in mt-3" style={{ '--v': `${areas[area]}%` } as React.CSSProperties} aria-hidden />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-20 grid gap-12 border-t border-line pt-10 md:mt-28 lg:grid-cols-2" aria-label="Para pensar">
        {report.costFormula && (
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">Cuánto te cuesta hoy</h2>
            <p className="mt-4 text-ink-soft">No ponemos una cifra que no conocemos. Esta cuenta la podés hacer con tus números:</p>
            <p className="mt-5 border-l-2 border-gold pl-5 text-lg leading-relaxed text-ink">{report.costFormula}</p>
          </div>
        )}
        {report.question && (
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">Una pregunta para vos</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink">{report.question}</p>
          </div>
        )}
      </section>

      {report.note && (
        <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="note-title">
          <h2 id="note-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Una observación nuestra
          </h2>
          <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-ink-soft">{report.note}</p>
        </section>
      )}

      {report.proof && (
        <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="proof-title">
          <h2 id="proof-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Lo que ya hicimos
          </h2>
          <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-ink-soft">{report.proof}</p>
        </section>
      )}

      <section data-theme="dark" className="mt-20 border border-line bg-bg-elev px-6 py-12 text-ink sm:px-10 md:mt-28 md:py-16" aria-labelledby="cta-title">
        <h2 id="cta-title" className="h-section text-ink">
          Hay más para mostrarte
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Esto es lo que se ve desde afuera. En 20 minutos te mostramos el resto de lo que encontramos y qué haríamos primero en tu
          caso, sin compromiso.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          {settings.bookingUrl && (
            <a href={settings.bookingUrl} target="_blank" rel="noopener" className="btn btn-primary">
              Agendar 20 minutos
              <ArrowRight className="btn-arrow size-4" />
            </a>
          )}
          <a href={whatsapp} target="_blank" rel="noopener" className={`btn ${settings.bookingUrl ? 'btn-ghost' : 'btn-primary'}`}>
            <WhatsApp className="size-4" />
            Escribinos por WhatsApp
          </a>
          <Link href={`/diagnostico?informe=${token}`} className="btn btn-ghost">
            Hacer el diagnóstico gratuito
          </Link>
        </div>
      </section>

      <p className="mt-10 max-w-3xl text-sm text-ink-soft">
        Preparado por Exacta el {dateText(report.date)} con información pública: Google Maps, Google PageSpeed y su sitio web.
        {expiresAt && ` Este informe vence el ${dateText(expiresAt)}.`} Si no querés recibir más comunicaciones nuestras, respondé
        este mensaje o escribinos y no te contactamos más.
      </p>
    </div>
  )
}
