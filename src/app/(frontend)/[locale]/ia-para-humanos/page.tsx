/* eslint-disable @next/next/no-img-element */
import { getPayload } from 'payload'
import config from '@payload-config'
import { CookiePreferences } from '@/components/analytics/cookie-preferences'
import { Audiences } from '@/components/ia-humanos/audiences'
import { EnrollForm } from '@/components/ia-humanos/enroll-form'
import { FaqCards } from '@/components/ia-humanos/faq-cards'
import { Logo } from '@/components/ia-humanos/logo'
import { PageEffects } from '@/components/ia-humanos/page-effects'
import { Edge, SeatDots, seatsLine, WhatsappIcon } from '@/components/ia-humanos/parts'
import styles from '@/components/ia-humanos/ia.module.css'
import { closing, faqs, hero, includes, outcomes, photoCredits, problems, program, teacher } from '@/content/ia-humanos'
import { getTeam } from '@/lib/content'
import { argDate, daysUntil, pesos } from '@/lib/masterclass/model'
import { availability, currentMasterclass } from '@/lib/masterclass/service'
import { site, whatsappLink } from '@/lib/site'

export const dynamic = 'force-dynamic'

const WHATSAPP = whatsappLink('Hola, tengo una duda sobre la masterclass de IA para Humanos')
const WHATSAPP_COMPANIES = whatsappLink('Hola, quiero capacitar a mi equipo con la masterclass de IA para Humanos')

function duration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m}` : `${h} h`
}

function Three() {
  return (
    <span className={styles.three} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

export default async function IaParaHumanosPage() {
  const payload = await getPayload({ config })
  const m = await currentMasterclass(payload)
  const team = await getTeam().catch(() => [])
  const sebastian = team.find((t) => t.name.startsWith('Sebastián'))?.photo

  if (!m) {
    return (
      <main id="contenido" className={styles.paperWrap}>
        <header className={styles.bar}>
          <Logo />
        </header>
        <div className={styles.paper}>
          <h1 className={styles.h2}>La próxima masterclass está por anunciarse.</h1>
          <p>Escribinos por WhatsApp y te avisamos apenas abran las inscripciones.</p>
          <p>
            <a className={`${styles.btn} ${styles.btnDark}`} href={WHATSAPP} target="_blank" rel="noopener noreferrer">
              Avisame por WhatsApp
            </a>
          </p>
        </div>
      </main>
    )
  }

  const seats = await availability(payload, m)
  const date = argDate(m.startsAt)
  const days = daysUntil(m.startsAt)
  const minutes = m.durationMin ?? 150
  const line = seatsLine(seats, pesos)
  const open = !seats.closed && !seats.soldOut
  const totalValue = includes.items.reduce((sum, i) => sum + i.value, 0)
  const practice = program.modules.filter((x) => x.kind === 'practica').reduce((s, x) => s + x.minutes, 0)
  const programMinutes = program.modules.reduce((s, x) => s + x.minutes, 0)

  const cta = open ? (
    <a className={`${styles.btn} ${styles.btnDark}`} href="#reservar" id="iah-hero-cta">
      Reservar mi lugar a {pesos(seats.price)}
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </a>
  ) : (
    <a className={`${styles.btn} ${styles.btnDark}`} href={WHATSAPP} id="iah-hero-cta" target="_blank" rel="noopener noreferrer">
      Avisame si se libera un lugar
    </a>
  )

  return (
    <>
      <header className={styles.bar}>
        <Logo />
        {open && (
          <a className={`${styles.btn} ${styles.barCta}`} href="#reservar">
            Reservar mi lugar
          </a>
        )}
      </header>

      <main id="contenido">
        {/* The entry ticket beside the room */}
        <section className={styles.hero} aria-labelledby="iah-title">
          <article className={styles.entry}>
            <div className={styles.entryBand}>
              <span className={styles.label}>Entrada · Masterclass en vivo</span>
              <span className={styles.nodes} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className={styles.label}>
                {date.short} · {date.time}
              </span>
            </div>
            <div className={styles.entryMain}>
              <h1 id="iah-title" className={styles.entryTitle}>
                {hero.title}
              </h1>
              <p className={styles.lead}>{hero.lead}</p>
              <dl className={styles.facts}>
                <div>
                  <dt>{days > 1 ? `Faltan ${days} días` : days === 1 ? 'Es mañana' : 'Es hoy'}</dt>
                  <dd>{date.short}</dd>
                </div>
                <div>
                  <dt>Hora Argentina</dt>
                  <dd>{date.time}</dd>
                </div>
                <div>
                  <dt>En vivo</dt>
                  <dd>{duration(minutes)}</dd>
                </div>
                <div>
                  <dt>Queda grabada</dt>
                  <dd>Meet</dd>
                </div>
              </dl>
            </div>
            <div className={styles.perf} aria-hidden="true">
              <span className={styles.perfHoles} />
            </div>
            <div className={styles.stub}>
              <div className={styles.price}>
                <span className={styles.priceNow}>{pesos(seats.price)}</span>
                {seats.nextPrice && <span className={styles.priceNext}>Después, {pesos(seats.nextPrice)}</span>}
              </div>
              <div className={styles.stubAction}>
                <div className={styles.seats}>
                  <SeatDots seats={seats} />
                  <span className={styles.seatText}>{line}</span>
                </div>
                {cta}
              </div>
            </div>
          </article>
          <div className={`${styles.photoPane} ${styles.fade}`}>
            <img
              src="/ia-para-humanos/video.webp"
              alt="Una emprendedora graba un video con el celular"
              width={1600}
              height={1067}
            />
            <img src="/ia-para-humanos/notebook.webp" alt="Una mujer trabaja con su notebook" width={1600} height={2400} />
            <img
              src="/ia-para-humanos/cafe.webp"
              alt="Una mujer revisa el celular con la notebook abierta"
              width={1600}
              height={1068}
            />
          </div>
        </section>

        {/* The problem */}
        <section className={`${styles.section} ${styles.problem}`} aria-labelledby="iah-problem">
          <div className={`${styles.problemHead} ${styles.reveal}`} data-iah-reveal>
            <h2 id="iah-problem" className={styles.h2}>
              {problems.title}
            </h2>
            <p className={styles.problemNote}>{problems.close}</p>
          </div>
          <ul className={`${styles.pains} ${styles.reveal}`} data-iah-reveal>
            {problems.items.map((p) => (
              <li key={p}>
                <Three />
                {p}
              </li>
            ))}
          </ul>
          <span className={styles.bigWord} aria-hidden="true">
            HUMANOS
          </span>
        </section>

        {/* What you leave with: the menu sheet */}
        <section className={`${styles.section} ${styles.outcomes}`} aria-labelledby="iah-outcomes">
          <div className={`${styles.sheetWrap} ${styles.reveal}`} data-iah-reveal>
            <Edge kind="zigzag" side="top" color="#f4f0f7" />
            <div className={styles.sheet}>
              <div className={styles.sheetHead}>
                <h2 id="iah-outcomes" className={styles.h3}>
                  {outcomes.title}
                </h2>
                <span className={`${styles.label} ${styles.menuWhere}`}>{outcomes.note}</span>
              </div>
              <ul className={styles.menu}>
                {outcomes.items.map((o) => (
                  <li key={o.name}>
                    <div className={styles.menuRow}>
                      <span className={styles.menuName}>{o.name}</span>
                      <span className={styles.leader} aria-hidden="true" />
                      <span className={`${styles.label} ${styles.menuWhere}`}>{o.where}</span>
                    </div>
                    <p className={styles.menuText}>{o.text}</p>
                  </li>
                ))}
              </ul>
              <p className={styles.sheetFoot}>{outcomes.base}</p>
            </div>
            <Edge kind="zigzag" side="bottom" color="#f4f0f7" />
          </div>
          <figure className={`${styles.figure} ${styles.tall}`}>
            <img
              src="/ia-para-humanos/almacen.webp"
              alt="Un comerciante atiende detrás del mostrador de su almacén"
              width={1100}
              height={1467}
              loading="lazy"
            />
          </figure>
        </section>

        {/* Who it's for: the live sample */}
        <section className={`${styles.section} ${styles.audiences}`} aria-labelledby="iah-aud">
          <div className={`${styles.audHead} ${styles.reveal}`} data-iah-reveal>
            <h2 id="iah-aud" className={styles.h2}>
              Para quién es
            </h2>
            <p className={styles.problemNote} style={{ color: '#45344f' }}>
              Elegí tu rubro y mirá qué te llevás. La instrucción es real: copiala y probala hoy.
            </p>
          </div>
          <Audiences />
          <p className={styles.notFor}>
            Para quién no es: si ya programás o usás IA todos los días, esta clase te va a quedar corta.
          </p>
        </section>

        {/* The program: 150 minutes */}
        <section className={styles.section} aria-labelledby="iah-program">
          <div className={`${styles.programHead} ${styles.reveal}`} data-iah-reveal>
            <div>
              <h2 id="iah-program" className={styles.h2}>
                {program.title}
              </h2>
              <p className={styles.programLead}>{program.lead}</p>
            </div>
          </div>
          <div className={styles.timeline} aria-hidden="true">
            {program.modules.map((x) => (
              <span key={x.name} className={styles[x.kind]} style={{ flex: x.minutes }} />
            ))}
          </div>
          <p className={styles.legend}>
            <span>
              <i className={styles.practica} /> Práctica: {practice} min
            </span>
            <span>
              <i className={styles.concepto} /> Conceptos: {programMinutes - practice} min
            </span>
          </p>
          <ol className={styles.bars} aria-label="Módulos del programa">
            {program.modules.map((x, i) => (
              <li key={x.name} className={styles.module}>
                <span className={`${styles.label} ${styles.moduleNum}`}>Módulo {i + 1}</span>
                <h3 className={styles.moduleName}>{x.name}</h3>
                <p className={styles.moduleText}>{x.text}</p>
                <div className={`${styles.block} ${styles[x.kind]}`} style={{ '--min': x.minutes } as React.CSSProperties}>
                  <span className={styles.blockMin}>{x.minutes} min</span>
                  <span className={styles.blockKind}>{x.kind === 'practica' ? 'Práctica' : 'Concepto'}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Who teaches: the letter */}
        <section className={`${styles.section} ${styles.teacher}`} aria-labelledby="iah-teacher">
          <div className={`${styles.letterCol} ${styles.reveal}`} data-iah-reveal>
            <h2 id="iah-teacher" className={styles.h2}>
              {teacher.title}
            </h2>
            <div>
              <div className={styles.letter}>
                {teacher.letter.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                <p>Nos vemos el {date.long}.</p>
                <div className={styles.sign}>
                  <span className={styles.signName}>{teacher.name}</span>
                  <span className={styles.signRole}>{teacher.role}</span>
                </div>
              </div>
              <div className={styles.tear}>
                <span>¿Dudas antes de inscribirte? Preguntame.</span>
                <a className={`${styles.btn} ${styles.btnDark}`} href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                  Escribir por WhatsApp
                </a>
              </div>
            </div>
          </div>
          <div className={styles.reveal} data-iah-reveal>
            {sebastian && (
              <figure className={`${styles.figure} ${styles.portrait}`}>
                <img src={sebastian} alt="Sebastián Goiburo, cofundador de Exacta" width={1254} height={1254} loading="lazy" />
              </figure>
            )}
            <ul className={styles.factList}>
              {teacher.facts.map((f) => (
                <li key={f.big}>
                  <span className={styles.factBig}>{f.big}</span>
                  <span className={styles.factText}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The ticket: what's included, the price and the form */}
        <section id="reservar" className={`${styles.section} ${styles.pricing}`} aria-labelledby="iah-price">
          <div className={`${styles.pricingHead} ${styles.reveal}`} data-iah-reveal>
            <h2 id="iah-price" className={styles.h2}>
              Tu entrada
            </h2>
            <p className={styles.pricingNote}>
              {date.long[0].toUpperCase() + date.long.slice(1)}, {date.time} · Google Meet · {duration(minutes)} en vivo
            </p>
          </div>
          <div className={styles.ticket}>
            <div className={styles.ticketMain}>
              <h3 className={styles.h3}>{includes.title}</h3>
              <ul className={styles.valueList}>
                {includes.items.map((i) => (
                  <li key={i.name}>
                    <span className={styles.valueName}>{i.name}</span>
                    <span className={styles.leader} aria-hidden="true" />
                    <span className={styles.valueAmount}>{i.value ? pesos(i.value) : 'Incluido'}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.valueTotal}>
                <span>Valor de todo junto</span>
                <span className={styles.strike}>{pesos(totalValue)}</span>
              </p>
              <p className={styles.guarantee}>
                <Three />
                {includes.guarantee}
              </p>
            </div>
            <div className={styles.vperf} aria-hidden="true">
              <span />
            </div>
            <div className={styles.ticketStub}>
              <div className={styles.price}>
                <span className={styles.priceNow}>{pesos(seats.price)}</span>
                {seats.nextPrice && <span className={styles.priceNext}>Después, {pesos(seats.nextPrice)}</span>}
              </div>
              <div className={styles.seats}>
                <SeatDots seats={seats} />
                <span className={styles.seatText}>{line}</span>
              </div>
              {open ? (
                <EnrollForm price={seats.price} whatsapp={WHATSAPP} />
              ) : (
                <a
                  className={`${styles.btn} ${styles.btnDark} ${styles.btnWide}`}
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Avisame si se libera un lugar
                </a>
              )}
            </div>
          </div>
          <div className={styles.payRow}>
            <span>{includes.payment}</span>
            <a href={WHATSAPP_COMPANIES} target="_blank" rel="noopener noreferrer">
              {includes.companies}
            </a>
          </div>
        </section>

        {/* Questions */}
        <section className={styles.section} aria-labelledby="iah-faq">
          <h2 id="iah-faq" className={`${styles.h2} ${styles.faqHead}`}>
            {faqs.title}
          </h2>
          <FaqCards />
        </section>

        {/* Closing: the reply card */}
        <section className={`${styles.section} ${styles.closing}`} aria-labelledby="iah-close">
          <p className={styles.closingText} data-iah-reveal>
            {closing.text}
          </p>
          <div className={styles.reply}>
            <h2 id="iah-close" className={styles.replyTitle}>
              {closing.title}
            </h2>
            <div className={styles.seats}>
              <SeatDots seats={seats} />
              <span className={styles.seatText}>{line}</span>
            </div>
            {open ? (
              <a className={`${styles.btn} ${styles.btnDark} ${styles.btnWide}`} href="#reservar">
                Reservar mi lugar a {pesos(seats.price)}
              </a>
            ) : (
              <a
                className={`${styles.btn} ${styles.btnDark} ${styles.btnWide}`}
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
              >
                Avisame si se libera un lugar
              </a>
            )}
          </div>
        </section>
      </main>

      {/* The back of the card */}
      <footer className={styles.foot}>
        <Edge kind="scallop" side="top" color="#f4f0f7" />
        <div className={styles.back}>
          <div className={styles.backSign}>
            <Logo tone="light" />
            <p
              className={`${styles.h2} ${styles.backTitle}`}
              style={{ fontFamily: 'var(--display)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}
            >
              Nos vemos el {date.short.toLowerCase()}.
            </p>
            <p>IA para Humanos es la unidad de capacitación de Exacta: enseñamos a usar la IA en el trabajo de todos los días.</p>
          </div>
          <div className={styles.backRight}>
            <ul className={styles.backLinks}>
              <li>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                  WhatsApp {site.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <a href="https://www.instagram.com/sebastiangoiburo/" target="_blank" rel="noopener noreferrer">
                  Instagram @sebastiangoiburo
                </a>
              </li>
              <li>
                <a href="/">exactatransformaciondigital.com</a>
              </li>
            </ul>
            {sebastian && (
              <span className={styles.stamp}>
                <img src={sebastian} alt="" width={96} height={128} loading="lazy" />
              </span>
            )}
          </div>
          <div className={styles.imprint}>
            <span>
              © {new Date().getFullYear()} Exacta · {site.legalName} · CUIT {site.cuit} · {site.city}
            </span>
            <span className={styles.imprintLinks}>
              <a href="/ia-para-humanos/terminos">Términos y condiciones</a>
              <a href="/privacidad">Privacidad</a>
              <a href="/ia-para-humanos/arrepentimiento">Botón de arrepentimiento</a>
              <span className={styles.cookieBtn}>
                <CookiePreferences />
              </span>
            </span>
            <span>
              Fotos:{' '}
              {photoCredits.map((c, i) => (
                <span key={c.who}>
                  {i > 0 && ', '}
                  <a href={c.url} target="_blank" rel="noopener noreferrer">
                    {c.who}
                  </a>{' '}
                  ({c.licence})
                </span>
              ))}
              , vía Wikimedia Commons y Flickr.
            </span>
          </div>
        </div>
      </footer>

      {open && (
        <div className={styles.sticky} id="iah-sticky">
          <span className={styles.stickyPrice}>
            <strong>{pesos(seats.price)}</strong>
            {line}
          </span>
          <a className={styles.btn} href="#reservar">
            Reservar
          </a>
        </div>
      )}
      <a className={styles.whats} href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="Escribinos por WhatsApp">
        <WhatsappIcon />
      </a>
      <PageEffects price={seats.price} />
    </>
  )
}
