import type { Metadata } from 'next'
import { Fragment } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { AREAS, type Area } from '@/lib/diagnostic/questions'
import { AREA_NAMES } from '@/lib/diagnostic/recommendations'
import { placeSummary, type Place } from '@/lib/places'
import { calculatorFor } from '@/lib/prospecting/calculators'
import { calculatorPrice as calculatorPriceOf, priceLines, termsFrom } from '@/lib/prospecting/price'
import { cms, reportLogo, SUMMARY_CLOSE, type Competitor, type ReportContent } from '@/lib/prospecting/service'
import { getSettings } from '@/lib/settings'
import { whatsappLink } from '@/lib/site'
import type { Media, OfferProfile } from '@/payload-types'
import { ArrowRight, WhatsApp } from '@/components/ui/icons'
import { CostCalculator } from '@/components/report/cost-calculator'
import { OpenBeacon } from '@/components/report/open-beacon'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; token: string }> }

const TOKEN = /^[A-Za-z0-9_-]{10,40}$/

/** Link previews (WhatsApp, email, social) fetch the page too: they get it without asking Google for anything. */
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skype|embedly|linkedin|headless/i

async function getReport(token: string) {
  if (!TOKEN.test(token)) return null
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'prospects',
    where: { and: [{ reportToken: { equals: token } }, { reportReviewedAt: { exists: true } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const prospect = docs[0]
  if (!prospect?.report) return null
  const report = prospect.report as unknown as ReportContent
  const signer = report.signer
    ? await payload.findByID({ collection: 'team', id: report.signer, depth: 1, overrideAccess: true }).catch(() => null)
    : null
  const facts = prospect.facts as { query?: string } | null
  return {
    report,
    // Read again from the media library: if the file was deleted, the report just goes without it.
    logo: report.logo ? await reportLogo(payload, report.logo.id) : null,
    signer,
    profileKey: (prospect.profile as OfferProfile | null)?.key ?? null,
    search: { query: facts?.query ?? prospect.niche ?? '', zone: prospect.zone ?? '' },
    expiresAt: prospect.reportExpiresAt ? new Date(prospect.reportExpiresAt) : null,
  }
}

export async function generateMetadata(): Promise<Metadata> {
  // Private to its recipient: reachable only through its link and never indexed.
  return { title: 'Informe', robots: { index: false, follow: false } }
}

const dateText = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

const SOURCE_NAMES: Record<string, string> = {
  google_maps: 'tu perfil en Google',
  sitio: 'tu página web',
  pagespeed: 'Google PageSpeed, la herramienta de Google que mide qué tan rápido abre una página',
}
const sourceName = (source: string) =>
  SOURCE_NAMES[source] ?? (/^https?:\/\//.test(source) ? new URL(source).hostname : source || 'nuestra revisión')

type Row = Competitor & { place: Place | null; self: boolean }

/** Google Maps from the place ID alone, which Google allows to keep: the link needs no lookup. */
const mapsLink = (placeId: string) => `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`

/** Live Google lookups per report per day. Past this, the table shows without rating and reviews. */
const GOOGLE_LOADS_PER_DAY = 3
const googleLoads = new Map<string, { day: string; count: number }>()

/** Counts one lookup for this report today (Argentina's day). False once the day's lookups are used up. */
function takeGoogleLoad(token: string) {
  const day = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const entry = googleLoads.get(token)
  if (!entry || entry.day !== day) {
    googleLoads.set(token, { day, count: 1 })
    return true
  }
  if (entry.count >= GOOGLE_LOADS_PER_DAY) return false
  entry.count += 1
  return true
}

/** By position in Google, so the client sits where it really is and never looks like it leads. Unknown goes last. */
const byPosition = (a: Row, b: Row) => (a.position || Infinity) - (b.position || Infinity)

/**
 * The comparison table. Ratings come live from Google (they can't be stored); if Google doesn't answer,
 * the rows stay with what we measured ourselves and the reviews column is left out.
 */
async function comparisonRows(report: ReportContent, askGoogle: boolean): Promise<Row[]> {
  const competitors = report.competitors ?? []
  if (!competitors.length) return []
  const entries = [...(report.self ? [{ ...report.self, self: true }] : []), ...competitors.map((c) => ({ ...c, self: false }))]
  const places = askGoogle
    ? await Promise.all(entries.map((e) => placeSummary(e.placeId).catch(() => null)))
    : entries.map(() => null)
  return entries.map((e, i) => ({ ...e, place: places[i] })).sort(byPosition)
}

/** Yes or no in words and a mark, so it reads at a glance and to a screen reader. */
function Mark({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-ink-soft">Sin dato</span>
  return value ? <span className="text-ink">✓ Sí</span> : <span className="text-ink-soft">✗ No</span>
}

/** Google PageSpeed's 0–100 score, in words. */
const speedText = (score: number | null) => (score === null ? '—' : score >= 90 ? 'Rápida' : score >= 50 ? 'Regular' : 'Lenta')

/** Pages of ours mentioned in the proof ("Página: /industrias/salud") become links; the text keeps the rest. */
const OWN_PATH = /(?:https?:\/\/[^\s,;]+[^\s,;.)]|\/[a-z0-9][a-z0-9/-]*[a-z0-9])/gi
function proofParts(proof: string) {
  const links = [...new Set(proof.match(OWN_PATH) ?? [])]
  const text = proof
    .replace(/\s*Páginas?:?\s*[^\n]*$/i, '')
    .replace(OWN_PATH, '')
    .trim()
  return {
    text,
    links: links.map((href, i) => ({
      href,
      label: href.includes('/industrias/')
        ? 'Ver el caso completo'
        : links.length > 1
          ? `Ver cómo lo hacemos (${i + 1})`
          : 'Ver cómo lo hacemos',
    })),
  }
}

function ProofLinks({ links }: { links: { href: string; label: string }[] }) {
  return links.map((l) =>
    l.href.startsWith('/') ? (
      <Link key={l.href} href={l.href} className="mt-3 mr-5 inline-flex items-center gap-2 font-semibold text-ink underline">
        {l.label}
        <ArrowRight className="size-4" />
      </Link>
    ) : (
      <a
        key={l.href}
        href={l.href}
        target="_blank"
        rel="noopener"
        className="mt-3 mr-5 inline-flex items-center gap-2 font-semibold text-ink underline"
      >
        {l.label}
        <ArrowRight className="size-4" />
      </a>
    ),
  )
}

const H2 = 'font-display text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] font-semibold tracking-[-0.02em] text-ink'
const SECTION = 'mt-16 border-t border-line pt-10 md:mt-24'

/** The price of one step: the main way to pay large, the alternatives and the monthly charge below it. */
function PriceBlock({ lines }: { lines: ReturnType<typeof priceLines> }) {
  if (!lines.main) return null
  return (
    <div className="mt-auto pt-6">
      {lines.from && <p className="font-mono text-xs tracking-[0.08em] text-ink-soft uppercase">Desde</p>}
      <p className="mt-1 font-display text-xl font-semibold tracking-[-0.01em] text-ink">{lines.main}</p>
      {lines.others.map((line) => (
        <p key={line} className="mt-1 text-sm text-ink-soft">
          {line}
        </p>
      ))}
      {lines.monthly && <p className="mt-1 text-sm text-ink-soft">{lines.monthly}</p>}
    </div>
  )
}

export default async function ProspectReport({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }
  setRequestLocale(locale)

  const found = await getReport(token)
  if (!found) notFound()
  const { report, logo, signer, profileKey, search, expiresAt } = found
  const expired = !expiresAt || expiresAt.getTime() < Date.now()
  const whatsapp = whatsappLink(`Hola, soy de ${report.company}. Leí el informe que nos mandaron y me gustaría saber más.`)

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

  const requestHeaders = await headers()
  const isBot = BOT.test(requestHeaders.get('user-agent') ?? '')
  // The team looking at a report doesn't use up the reader's lookups.
  const { user } = await (await cms()).auth({ headers: requestHeaders }).catch(() => ({ user: null }))
  const askGoogle = !isBot && (user?.collection === 'users' || takeGoogleLoad(token))
  const [settings, rows] = await Promise.all([getSettings(), comparisonRows(report, askGoogle)])
  const withGoogle = rows.some((r) => r.place)
  const audience = report.audience || 'clientes'
  const summary = (report.summary ?? []).filter(Boolean)
  const areas = report.showAreas ? (report.areas as Record<Area, number> | null) : null
  const offer = report.offer?.services?.length ? report.offer : null
  const benefits = (offer?.benefits ?? []).filter(Boolean)
  const proof = report.proof ? proofParts(report.proof) : null
  const calculator = calculatorFor(profileKey)
  const terms = termsFrom(settings)
  const firstPrice = offer?.services.find((s) => s.price)?.price ?? null
  const calculatorPrice = firstPrice ? calculatorPriceOf(firstPrice, terms) : null
  const firstWhen = offer?.services.find((s) => s.when)?.when
  const signerPhoto = signer && typeof signer.photo === 'object' ? (signer.photo as Media | null) : null
  const signerPhotoUrl = signerPhoto?.sizes?.card?.url ?? signerPhoto?.url ?? null
  const signerFirstName = signer?.name.split(' ')[0]
  const offerWhatsapp = offer
    ? whatsappLink(
        `Hola, soy de ${report.company}. Leí el informe y me interesa la propuesta: ${offer.services.map((s) => s.name).join(', ')}.`,
      )
    : whatsapp
  const nameOf = (r: Row) => (r.self ? report.company : r.name || r.place?.name || `Negocio en el lugar ${r.position}`)
  const reviewsOf = (r: Row) =>
    r.place?.reviews !== undefined ? `${r.place.reviews}${r.place.rating ? ` · ${r.place.rating} ★` : ''}` : '—'

  return (
    <div className="container-x pt-36 pb-32 md:pt-44 md:pb-28">
      <OpenBeacon token={token} />

      {/* 1. Who writes, why, and the loss in one line. */}
      <header className={logo ? 'max-w-5xl' : 'max-w-3xl'}>
        <p className="eyebrow">Informe para {report.company}</p>
        {logo ? (
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            {/* On white, so any logo reads well in light and dark mode. */}
            <div className="flex h-24 w-44 shrink-0 items-center justify-center border border-line bg-white p-4 sm:h-32 sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.url}
                alt={`Logo de ${report.company}`}
                width={logo.width ?? undefined}
                height={logo.height ?? undefined}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <h1 className="h-display text-[clamp(2.25rem,1.5rem+3vw,4.25rem)] text-ink">{report.headline}</h1>
          </div>
        ) : (
          <h1 className="h-display mt-6 text-[clamp(2.25rem,1.5rem+3vw,4.25rem)] text-ink">{report.headline}</h1>
        )}
        {report.intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink">{report.intro}</p>}
        {signer && (
          <div className="mt-6 flex items-center gap-3">
            {signerPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signerPhotoUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />
            )}
            <p className="text-sm leading-snug text-ink-soft">
              Lo revisé personalmente.
              <br />
              <span className="text-ink">{signer.name}</span>
              {signer.role ? `, ${signer.role}` : ''} · Exacta, Mendoza
            </p>
          </div>
        )}
      </header>

      {/* 2. For whoever reads only this. */}
      {summary.length > 0 && (
        <section
          className="mt-12 max-w-3xl border-l-4 border-accent bg-bg-elev px-6 py-7 md:px-8"
          aria-labelledby="summary-title"
        >
          <h2 id="summary-title" className="font-mono text-xs font-semibold tracking-[0.08em] text-accent uppercase">
            En 30 segundos
          </h2>
          <ul className="mt-4 grid gap-3 text-lg leading-relaxed text-ink">
            {summary.map((line, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="text-accent">
                  •
                </span>
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-lg font-semibold text-ink">{report.summaryClose || SUMMARY_CLOSE}</p>
        </section>
      )}

      {/* 3. The proof anyone can check: the first three against them. */}
      {(report.comparison || rows.length > 0) && (
        <section data-report-section="comparacion" className={SECTION} aria-labelledby="comparison-title">
          <h2 id="comparison-title" className={H2}>
            Así te ven tus {audience} hoy
          </h2>
          {report.comparison && <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-soft">{report.comparison}</p>}
          {rows.length > 0 && (
            <>
              {/* Phones: one card per business. */}
              <ol className="mt-8 grid gap-3 md:hidden">
                {rows.map((r, i) => (
                  <Fragment key={i}>
                    {r.self && i > 0 && r.position > rows[i - 1].position + 1 && (
                      <li className="text-center font-mono text-sm tracking-[0.3em] text-ink-soft" aria-hidden>
                        ···
                      </li>
                    )}
                    <li className={`border p-4 ${r.self ? 'border-ink bg-bg-elev' : 'border-line'}`}>
                      <p className="font-semibold text-ink">
                        <span className="font-mono text-accent">{r.position || '—'}.</span> {nameOf(r)}{' '}
                        {r.self && <span className="text-sm font-normal text-ink-soft">(vos)</span>}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-ink-soft">Página web</dt>
                          <dd>
                            <Mark value={r.website === 'own'} />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-soft">Turno por internet</dt>
                          <dd>
                            <Mark value={r.website === 'own' ? r.booking : false} />
                          </dd>
                        </div>
                        {withGoogle && (
                          <div className="col-span-2">
                            <dt className="text-ink-soft">Reseñas en Google</dt>
                            <dd className="font-mono text-ink">{reviewsOf(r)}</dd>
                          </div>
                        )}
                      </dl>
                    </li>
                  </Fragment>
                ))}
              </ol>

              <div className="mt-8 hidden md:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-sm text-ink-soft">
                      <th className="py-3 pr-4 font-semibold">Lugar en Google</th>
                      <th className="py-3 pr-4 font-semibold">Negocio</th>
                      {withGoogle && <th className="py-3 pr-4 font-semibold">Reseñas</th>}
                      <th className="py-3 pr-4 font-semibold">Página web</th>
                      <th className="py-3 pr-4 font-semibold">Turno por internet</th>
                      <th className="py-3 font-semibold">Abre en el celular</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <Fragment key={i}>
                        {/* Places skipped between the leaders and the client, so the distance shows. */}
                        {r.self && i > 0 && r.position > rows[i - 1].position + 1 && (
                          <tr className="border-b border-line text-ink-soft" aria-hidden>
                            <td colSpan={withGoogle ? 6 : 5} className="py-2 text-center font-mono text-sm tracking-[0.3em]">
                              ···
                            </td>
                          </tr>
                        )}
                        <tr className={`border-b border-line ${r.self ? 'bg-bg-elev font-semibold text-ink' : 'text-ink-soft'}`}>
                          <td className="py-3 pr-4 font-mono text-lg">{r.position || '—'}</td>
                          <td className="py-3 pr-4">
                            {r.self ? (
                              <>
                                {report.company} <span className="text-sm font-normal text-ink-soft">(vos)</span>
                              </>
                            ) : (
                              <a href={mapsLink(r.placeId)} target="_blank" rel="noopener nofollow" className="underline">
                                {nameOf(r)}
                              </a>
                            )}
                          </td>
                          {withGoogle && <td className="py-3 pr-4 font-mono">{reviewsOf(r)}</td>}
                          <td className="py-3 pr-4">
                            <Mark value={r.website === 'own'} />
                          </td>
                          <td className="py-3 pr-4">
                            <Mark value={r.website === 'own' ? r.booking : false} />
                          </td>
                          <td className="py-3">{r.website === 'own' ? speedText(r.pageSpeed) : '—'}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 max-w-3xl text-sm text-ink-soft">
                «Lugar en Google» es en qué lugar de la lista aparece cada negocio cuando alguien busca «{search.query}» en
                Google. Cuanto más abajo aparece un negocio, menos gente llega a verlo.
              </p>
            </>
          )}
        </section>
      )}

      {/* 4. The pain, in everyday words. */}
      {report.findings.length > 0 && (
        <section data-report-section="hallazgos" className={SECTION} aria-labelledby="findings-title">
          <h2 id="findings-title" className={H2}>
            Lo que te está costando
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {report.findings.map((f, i) => (
              <li key={i} className="border-t-2 border-gold pt-5">
                <p className="font-mono text-sm text-gold">0{i + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{f.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">Qué pasa hoy: </span>
                  {f.detail}
                </p>
                {f.impact && (
                  <p className="mt-3 leading-relaxed text-ink-soft">
                    <span className="font-semibold text-ink">Qué te cuesta: </span>
                    {f.impact}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 5. The money, with an example already in so the result shows without typing. */}
      {report.costFormula && (
        <section className={SECTION} aria-labelledby="cost-title">
          <div className="max-w-4xl">
            <p className="mb-4 inline-block bg-accent px-3 py-1.5 font-mono text-xs font-semibold tracking-[0.08em] text-accent-ink uppercase">
              Calculá vos si conviene invertir en esto
            </p>
            <h2 id="cost-title" className={H2}>
              {calculator?.title ?? 'Cuánto te cuesta hoy'}
            </h2>
            {calculator ? (
              <>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink">{calculator.purpose}</p>
                <CostCalculator
                  calculator={calculator}
                  formula={report.costFormula}
                  price={calculatorPrice}
                  example={report.calcExample}
                />
              </>
            ) : (
              <>
                <p className="mt-4 text-ink-soft">Esta cuenta la podés hacer con tus números:</p>
                <p className="mt-5 border-l-2 border-gold pl-5 text-lg leading-relaxed text-ink">{report.costFormula}</p>
              </>
            )}
          </div>
        </section>
      )}

      {areas && (
        <section className={SECTION} aria-labelledby="areas-title">
          <h2 id="areas-title" className={H2}>
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

      {report.note && (
        <section className={SECTION} aria-labelledby="note-title">
          <h2 id="note-title" className={H2}>
            {signerFirstName ? `Una nota de ${signerFirstName}` : 'Una nota nuestra'}
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed whitespace-pre-line text-ink-soft">{report.note}</p>
        </section>
      )}

      {/* 6 and 7. What changes for them, what it includes and costs, and the proof that it works. */}
      {offer ? (
        <section
          data-report-section="propuesta"
          className="mt-16 border-2 border-accent bg-accent-soft px-6 py-12 sm:px-10 md:mt-24 md:py-16"
          aria-labelledby="offer-title"
        >
          <p className="font-mono text-xs tracking-[0.08em] text-accent uppercase">Nuestra propuesta para {report.company}</p>
          <h2 id="offer-title" className="h-section mt-4 max-w-3xl text-ink">
            {offer.title}
          </h2>
          {offer.intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{offer.intro}</p>}

          {benefits.length > 0 && (
            <div className="mt-10 max-w-3xl">
              <h3 className="text-lg font-semibold text-ink">Qué cambia para vos</h3>
              <ul className="mt-4 grid gap-3">
                {benefits.map((b, i) => (
                  <li key={i} className="flex gap-3 text-lg leading-relaxed text-ink">
                    <span aria-hidden className="font-semibold text-accent">
                      ✓
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h3 className="mt-12 text-lg font-semibold text-ink">
            {offer.services.length > 1 ? 'Cómo lo hacemos' : 'Qué incluye'}
          </h3>
          <ol
            className={`mt-4 grid gap-5 ${
              offer.services.length === 1
                ? 'max-w-2xl'
                : offer.services.length === 2
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {offer.services.map((s, i) => (
              <li key={i} className="flex flex-col border border-line bg-bg-elev p-6 md:p-8">
                {(offer.services.length > 1 || s.when) && (
                  <p className="font-mono text-sm text-accent">
                    {offer.services.length > 1 ? `Etapa ${i + 1}` : ''}
                    {offer.services.length > 1 && s.when ? ' · ' : ''}
                    {s.when}
                  </p>
                )}
                <h4 className="mt-3 font-display text-xl font-semibold tracking-[-0.02em] text-ink md:text-2xl">{s.name}</h4>
                {s.description && <p className="mt-3 leading-relaxed text-ink-soft">{s.description}</p>}
                {s.price && <PriceBlock lines={priceLines(s.price, terms)} />}
              </li>
            ))}
          </ol>
          {firstPrice && expiresAt && (
            <p className="mt-4 text-sm text-ink-soft">
              Precios de referencia, válidos hasta el {dateText(expiresAt)}. El presupuesto final depende de lo que definamos
              juntos.
            </p>
          )}

          {(report.proofResult || proof) && (
            <div className="mt-12 max-w-3xl border-l-4 border-accent pl-6">
              <p className="font-mono text-xs tracking-[0.08em] text-accent uppercase">Ya lo hicimos</p>
              {report.proofResult && (
                <p className="mt-3 font-display text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] leading-tight font-semibold text-ink">
                  {report.proofResult}
                </p>
              )}
              {proof?.text && <p className="mt-3 text-lg leading-relaxed text-ink-soft">{proof.text}</p>}
              {proof && <ProofLinks links={proof.links} />}
            </div>
          )}

          <a href={offerWhatsapp} target="_blank" rel="noopener" data-report-cta="propuesta" className="btn btn-primary mt-10">
            <WhatsApp className="size-4" />
            Quiero conversar esta propuesta
          </a>
        </section>
      ) : (
        (report.proofResult || proof) && (
          <section className={SECTION} aria-labelledby="proof-title">
            <h2 id="proof-title" className={H2}>
              Ya lo hicimos
            </h2>
            {report.proofResult && (
              <p className="mt-4 font-display text-2xl leading-tight font-semibold text-ink">{report.proofResult}</p>
            )}
            {proof?.text && <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-soft">{proof.text}</p>}
            {proof && <ProofLinks links={proof.links} />}
          </section>
        )
      )}

      {/* 8. The next step, small and obvious. */}
      <section
        data-report-section="final"
        data-theme="dark"
        className="mt-16 border border-line bg-bg-elev px-6 py-12 text-ink sm:px-10 md:mt-24 md:py-16"
        aria-labelledby="cta-title"
      >
        <h2 id="cta-title" className="h-section text-ink">
          Cómo seguimos
        </h2>
        <ol className="mt-8 grid max-w-3xl gap-5">
          {[
            'Escribinos por WhatsApp, o agendá 20 minutos si preferís hablar.',
            'En esa charla te mostramos un boceto de cómo quedaría en tu caso. Sin compromiso.',
            `Si te convence, arrancamos.${firstWhen ? ` ${firstWhen.replace(/\.$/, '')}.` : ''}`,
          ].map((step, i) => (
            <li key={i} className="flex gap-4 text-lg leading-relaxed text-ink">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-sm font-semibold text-accent-ink">
                {i + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <a href={offerWhatsapp} target="_blank" rel="noopener" data-report-cta="whatsapp" className="btn btn-primary">
            <WhatsApp className="size-4" />
            Escribinos por WhatsApp
          </a>
          {settings.bookingUrl && (
            <a href={settings.bookingUrl} target="_blank" rel="noopener" data-report-cta="agenda" className="btn btn-ghost">
              Agendar 20 minutos
              <ArrowRight className="btn-arrow size-4" />
            </a>
          )}
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          {signer ? `Te responde ${signer.name}. ` : ''}
          {firstPrice && expiresAt ? `Los precios de esta propuesta valen hasta el ${dateText(expiresAt)}.` : ''}
        </p>
      </section>

      {/* 9. How it was done, for whoever wants to check. */}
      <details className="mt-10 max-w-3xl border-t border-line pt-6 text-ink-soft">
        <summary className="cursor-pointer font-semibold text-ink">Cómo hicimos este informe</summary>
        <ul className="mt-4 grid gap-2 text-sm leading-relaxed">
          <li>
            Lugar en Google: búsqueda de «{search.query}» en {search.zone || 'tu zona'} hecha por Exacta el{' '}
            {dateText(report.date)}. Google ordena distinto según desde dónde se busca, así que desde tu negocio quizás te veas
            más arriba: probá buscarlo desde otro barrio o en una ventana privada.
          </li>
          {withGoogle && <li>Reseñas y calificación: Google, consultadas hoy, {dateText(new Date())}.</li>}
          <li>
            Página web, turno por internet y velocidad: revisamos la página de cada negocio y medimos qué tan rápido abre en el
            celular con Google PageSpeed, la herramienta de Google para eso.
          </li>
          {report.findings.map((f, i) => (
            <li key={i}>
              {i + 1}. «{f.title}»: dato tomado de {sourceName(f.source)}, el {dateText(report.date)}.
            </li>
          ))}
          <li>Usamos solo información pública. Este informe vence el {expiresAt ? dateText(expiresAt) : ''}.</li>
        </ul>
      </details>

      <p className="mt-8 max-w-3xl text-sm text-ink-soft">
        ¿Preferís hacerlo por tu cuenta?{' '}
        <Link href={`/diagnostico?informe=${token}`} data-report-cta="diagnostico" className="underline">
          Hacé el diagnóstico gratuito
        </Link>
        . Si no querés recibir más comunicaciones nuestras, respondé este mensaje o escribinos y no te contactamos más.
      </p>

      {/* Phones: the way to answer is always one thumb away. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 p-3 backdrop-blur md:hidden">
        <a
          href={offerWhatsapp}
          target="_blank"
          rel="noopener"
          data-report-cta="whatsapp"
          className="btn btn-primary w-full justify-center"
        >
          <WhatsApp className="size-4" />
          Escribinos por WhatsApp
        </a>
      </div>
    </div>
  )
}
