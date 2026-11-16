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
import { priceText } from '@/lib/prospecting/price'
import { cms, reportLogo, type Competitor, type ReportContent } from '@/lib/prospecting/service'
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

function sourceText(source: string, date: string) {
  if (source === 'google_maps') return `Fuente: Google Maps, consultado el ${dateText(date)}`
  if (source === 'sitio') return `Fuente: revisión de tu sitio web, ${dateText(date)}`
  if (source === 'pagespeed') return `Fuente: Google PageSpeed para celulares, ${dateText(date)}`
  return source ? 'Fuente: ' : ''
}

type Row = Omit<Competitor, 'placeId'> & { place: Place | null; self: boolean }

/** By position in Google Maps, so the client sits where it really is and never looks like it leads. Unknown goes last. */
const byPosition = (a: Row, b: Row) => (a.position || Infinity) - (b.position || Infinity)

/**
 * The comparison table. Names and ratings come live from Google (they can't be stored); if Google doesn't
 * answer, the rows stay with what we measured ourselves and the rating columns are left out.
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

const yesNo = (v: boolean | null) => (v === null ? 'Sin dato' : v ? 'Sí' : 'No')
const siteText = (w: Competitor['website']) => (w === 'own' ? 'Propio' : w === 'social' ? 'Solo redes' : 'No tiene')

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

const H2 = 'font-display text-2xl font-semibold tracking-[-0.02em] text-ink'

export default async function ProspectReport({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }
  setRequestLocale(locale)

  const found = await getReport(token)
  if (!found) notFound()
  const { report, logo, signer, profileKey, search, expiresAt } = found
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

  const isBot = BOT.test((await headers()).get('user-agent') ?? '')
  const [settings, rows] = await Promise.all([getSettings(), comparisonRows(report, !isBot)])
  const withGoogle = rows.some((r) => r.place)
  const areas = report.showAreas ? (report.areas as Record<Area, number> | null) : null
  const offer = report.offer?.services?.length ? report.offer : null
  const proof = report.proof ? proofParts(report.proof) : null
  const calculator = calculatorFor(profileKey)
  const firstPrice = offer?.services.find((s) => s.price)?.price ?? null
  const calculatorPrice =
    firstPrice?.currency === 'ARS' ? { amount: firstPrice.amount, text: priceText(firstPrice, { midSentence: true }) } : null
  const signerPhoto = signer && typeof signer.photo === 'object' ? (signer.photo as Media | null) : null
  const signerPhotoUrl = signerPhoto?.sizes?.card?.url ?? signerPhoto?.url ?? null
  const offerWhatsapp = offer
    ? whatsappLink(
        `Hola, soy de ${report.company}. Leí el informe y me interesa la propuesta: ${offer.services.map((s) => s.name).join(', ')}.`,
      )
    : whatsapp
  const nameOf = (r: Row) => (r.self ? report.company : r.place?.name || `Negocio en el puesto ${r.position}`)

  return (
    <div className="container-x pt-36 pb-32 md:pt-44 md:pb-28">
      <OpenBeacon token={token} />

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
        {report.intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">{report.intro}</p>}
      </header>

      {report.findings.length > 0 && (
        <section
          data-report-section="hallazgos"
          className="mt-20 border-t border-line pt-10 md:mt-28"
          aria-labelledby="findings-title"
        >
          <h2 id="findings-title" className={H2}>
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

      {(report.comparison || rows.length > 0) && (
        <section
          data-report-section="comparacion"
          className="mt-20 border-t border-line pt-10 md:mt-28"
          aria-labelledby="comparison-title"
        >
          <h2 id="comparison-title" className={H2}>
            Frente a los primeros de tu zona
          </h2>
          {report.comparison && <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">{report.comparison}</p>}
          {rows.length > 0 && (
            <>
              {/* Phones: one card per business, with the three numbers that matter. */}
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
                        {nameOf(r)} {r.self && <span className="text-sm font-normal text-ink-soft">(tu negocio)</span>}
                      </p>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <dt className="text-ink-soft">Puesto</dt>
                          <dd className="font-mono text-ink">{r.position || '—'}</dd>
                        </div>
                        {withGoogle ? (
                          <div>
                            <dt className="text-ink-soft">Reseñas</dt>
                            <dd className="font-mono text-ink">
                              {r.place?.reviews ?? '—'}
                              {r.place?.rating ? ` · ${r.place.rating}★` : ''}
                            </dd>
                          </div>
                        ) : (
                          <div>
                            <dt className="text-ink-soft">Sitio web</dt>
                            <dd className="text-ink">{siteText(r.website)}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-ink-soft">Turnos online</dt>
                          <dd className="text-ink">{r.website === 'own' ? yesNo(r.booking) : 'No'}</dd>
                        </div>
                      </dl>
                    </li>
                  </Fragment>
                ))}
              </ol>

              <div className="mt-8 hidden md:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-sm text-ink-soft">
                      <th className="py-3 pr-4 font-semibold">Negocio</th>
                      <th className="py-3 pr-4 font-semibold">Puesto en Google Maps</th>
                      {withGoogle && <th className="py-3 pr-4 font-semibold">Calificación</th>}
                      {withGoogle && <th className="py-3 pr-4 font-semibold">Reseñas</th>}
                      <th className="py-3 pr-4 font-semibold">Sitio web</th>
                      <th className="py-3 pr-4 font-semibold">Turnos online</th>
                      <th className="py-3 font-semibold">Velocidad en celular</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <Fragment key={i}>
                        {/* Positions skipped between the leaders and the client, so the distance shows. */}
                        {r.self && i > 0 && r.position > rows[i - 1].position + 1 && (
                          <tr className="border-b border-line text-ink-soft" aria-hidden>
                            <td colSpan={withGoogle ? 7 : 5} className="py-2 text-center font-mono text-sm tracking-[0.3em]">
                              ···
                            </td>
                          </tr>
                        )}
                        <tr className={`border-b border-line ${r.self ? 'bg-bg-elev font-semibold text-ink' : 'text-ink-soft'}`}>
                          <td className="py-3 pr-4">
                            {r.self ? (
                              <>
                                {report.company} <span className="text-sm font-normal text-ink-soft">(tu negocio)</span>
                              </>
                            ) : r.place?.mapsUrl ? (
                              <a href={r.place.mapsUrl} target="_blank" rel="noopener nofollow" className="underline">
                                {r.place.name}
                              </a>
                            ) : (
                              nameOf(r)
                            )}
                          </td>
                          <td className="py-3 pr-4 font-mono">{r.position || '—'}</td>
                          {withGoogle && <td className="py-3 pr-4 font-mono">{r.place?.rating ?? '—'}</td>}
                          {withGoogle && <td className="py-3 pr-4 font-mono">{r.place?.reviews ?? '—'}</td>}
                          <td className="py-3 pr-4">{siteText(r.website)}</td>
                          <td className="py-3 pr-4">{r.website === 'own' ? yesNo(r.booking) : 'No'}</td>
                          <td className="py-3 font-mono">{r.pageSpeed === null ? '—' : `${r.pageSpeed}/100`}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 max-w-3xl text-sm text-ink-soft">
                El puesto es el que mostró Google Maps al buscar «{search.query} en {search.zone}» el {dateText(report.date)}.
                Google ordena distinto según desde dónde se busca, así que desde tu negocio quizás te veas más arriba: probá
                buscarlo desde otro barrio o en una ventana privada.
                {withGoogle && ` Calificación y reseñas: Google Maps, consultado el ${dateText(new Date())}.`} Sitio, turnos
                online y velocidad (Google PageSpeed): revisión de Exacta.
              </p>
            </>
          )}
        </section>
      )}

      {areas && (
        <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="areas-title">
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

      {(report.costFormula || report.question) && (
        <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-label="Para pensar">
          {report.costFormula && (
            <div className="max-w-4xl">
              <h2 className={H2}>Cuánto te cuesta hoy</h2>
              {calculator ? (
                <>
                  <p className="mt-4 max-w-2xl text-ink-soft">
                    No ponemos una cifra que no conocemos: completala con tus números.
                  </p>
                  <CostCalculator calculator={calculator} formula={report.costFormula} price={calculatorPrice} />
                </>
              ) : (
                <>
                  <p className="mt-4 text-ink-soft">
                    No ponemos una cifra que no conocemos. Esta cuenta la podés hacer con tus números:
                  </p>
                  <p className="mt-5 border-l-2 border-gold pl-5 text-lg leading-relaxed text-ink">{report.costFormula}</p>
                </>
              )}
            </div>
          )}
          {report.question && (
            <div className={report.costFormula ? 'mt-14 max-w-3xl' : 'max-w-3xl'}>
              <h2 className={H2}>Una pregunta para vos</h2>
              <p className="mt-5 text-lg leading-relaxed text-ink">{report.question}</p>
            </div>
          )}
        </section>
      )}

      {report.note && (
        <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="note-title">
          <h2 id="note-title" className={H2}>
            Una observación nuestra
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed whitespace-pre-line text-ink-soft">{report.note}</p>
        </section>
      )}

      {offer ? (
        // The one block in the brand color: what we'd do for them, with the proof right next to it.
        <section
          data-report-section="propuesta"
          className="mt-20 border-2 border-accent bg-accent-soft px-6 py-12 sm:px-10 md:mt-28 md:py-16"
          aria-labelledby="offer-title"
        >
          <p className="font-mono text-xs tracking-[0.08em] text-accent uppercase">Nuestra propuesta para {report.company}</p>
          <h2 id="offer-title" className="h-section mt-4 max-w-3xl text-ink">
            {offer.title}
          </h2>
          {offer.intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{offer.intro}</p>}
          <ol
            className={`mt-10 grid gap-5 ${
              offer.services.length === 1
                ? 'max-w-2xl'
                : offer.services.length === 2
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {offer.services.map((s, i) => (
              <li key={i} className="flex flex-col border border-line bg-bg-elev p-6 md:p-8">
                <p className="font-mono text-sm text-accent">
                  {offer.services.length > 1 ? `Etapa ${i + 1}` : 'Lo que haríamos'}
                  {s.when ? ` · ${s.when}` : ''}
                </p>
                <h3 className="mt-3 font-display text-xl font-semibold tracking-[-0.02em] text-ink md:text-2xl">{s.name}</h3>
                {s.description && <p className="mt-3 leading-relaxed text-ink-soft">{s.description}</p>}
                {s.price && <p className="mt-auto pt-5 font-mono text-lg text-ink">{priceText(s.price)}</p>}
              </li>
            ))}
          </ol>
          {firstPrice && expiresAt && (
            <p className="mt-4 text-sm text-ink-soft">
              Precios de referencia, válidos hasta el {dateText(expiresAt)}. El presupuesto final depende de lo que definamos
              juntos.
            </p>
          )}

          {proof && (
            <div className="mt-10 max-w-3xl border-l-2 border-accent pl-5">
              <p className="font-semibold text-ink">Un caso parecido</p>
              {proof.text && <p className="mt-2 text-lg leading-relaxed text-ink">{proof.text}</p>}
              <ProofLinks links={proof.links} />
            </div>
          )}

          <a href={offerWhatsapp} target="_blank" rel="noopener" data-report-cta="propuesta" className="btn btn-primary mt-10">
            <WhatsApp className="size-4" />
            Quiero conversar esta propuesta
          </a>
        </section>
      ) : (
        proof && (
          <section className="mt-20 border-t border-line pt-10 md:mt-28" aria-labelledby="proof-title">
            <h2 id="proof-title" className={H2}>
              Lo que ya hicimos
            </h2>
            {proof.text && <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">{proof.text}</p>}
            <ProofLinks links={proof.links} />
          </section>
        )
      )}

      <section
        data-report-section="final"
        data-theme="dark"
        className="mt-20 border border-line bg-bg-elev px-6 py-12 text-ink sm:px-10 md:mt-28 md:py-16"
        aria-labelledby="cta-title"
      >
        <h2 id="cta-title" className="h-section text-ink">
          Hay más para mostrarte
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Esto es lo que se ve desde afuera. En 20 minutos te mostramos el resto de lo que encontramos y qué haríamos primero en
          tu caso, sin compromiso.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          {settings.bookingUrl ? (
            <>
              <a href={settings.bookingUrl} target="_blank" rel="noopener" data-report-cta="agenda" className="btn btn-primary">
                Agendar 20 minutos
                <ArrowRight className="btn-arrow size-4" />
              </a>
              <a href={whatsapp} target="_blank" rel="noopener" data-report-cta="whatsapp" className="btn btn-ghost">
                <WhatsApp className="size-4" />
                Prefiero escribir por WhatsApp
              </a>
            </>
          ) : (
            <a href={whatsapp} target="_blank" rel="noopener" data-report-cta="whatsapp" className="btn btn-primary">
              <WhatsApp className="size-4" />
              Escribinos por WhatsApp
            </a>
          )}
        </div>

        {signer && (
          <div className="mt-12 flex items-center gap-4 border-t border-line pt-8">
            {signerPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signerPhotoUrl}
                alt={signer.name}
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-ink">Revisé este informe personalmente. Si algo no se entiende, escribime y lo vemos.</p>
              <p className="mt-1 text-sm text-ink-soft">
                {signer.name}
                {signer.role ? `, ${signer.role}` : ''} · Exacta
              </p>
            </div>
          </div>
        )}
      </section>

      <p className="mt-10 max-w-3xl text-sm text-ink-soft">
        Preparado por Exacta el {dateText(report.date)} con información pública: Google Maps, Google PageSpeed y tu sitio web.
        {expiresAt && ` Este informe vence el ${dateText(expiresAt)}.`} ¿Preferís hacerlo por tu cuenta?{' '}
        <Link href={`/diagnostico?informe=${token}`} data-report-cta="diagnostico" className="underline">
          Hacé el diagnóstico gratuito
        </Link>
        . Si no querés recibir más comunicaciones nuestras, respondé este mensaje o escribinos y no te contactamos más.
      </p>

      {/* Phones: the way to answer is always one thumb away. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 p-3 backdrop-blur md:hidden">
        <a
          href={offer ? offerWhatsapp : whatsapp}
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
