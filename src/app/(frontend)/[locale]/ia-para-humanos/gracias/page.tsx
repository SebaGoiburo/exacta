import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Logo } from '@/components/ia-humanos/logo'
import { PurchaseTracker } from '@/components/ia-humanos/purchase-tracker'
import styles from '@/components/ia-humanos/ia.module.css'
import { argDate, pesos } from '@/lib/masterclass/model'
import { classInfo, enrollmentByToken, LANDING_PATH, syncPayment } from '@/lib/masterclass/service'
import { whatsappLink } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Tu entrada · IA para Humanos' }, robots: { index: false, follow: false } }

const WHATSAPP = whatsappLink('Hola, hice el pago de la masterclass de IA para Humanos y tengo una consulta')

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

/** Where Mercado Pago sends the buyer back. The payment is checked with Mercado Pago here too, not only by notification. */
export default async function ThanksPage({ searchParams }: Props) {
  const params = await searchParams
  const token = one(params.e)
  const paymentId = one(params.payment_id) || one(params.collection_id)
  const payload = await getPayload({ config })
  let enrollment = await enrollmentByToken(payload, token)

  if (enrollment && enrollment.status !== 'pagada' && paymentId) {
    await syncPayment(paymentId).catch((err) => console.error('[masterclass] sync on return failed', err))
    enrollment = await enrollmentByToken(payload, token)
  }

  const shell = (children: React.ReactNode) => (
    <main id="contenido" className={styles.paperWrap}>
      <header className={styles.bar} style={{ padding: '0 0 24px' }}>
        <Logo />
      </header>
      <div className={styles.paper}>{children}</div>
    </main>
  )

  if (!enrollment || typeof enrollment.masterclass !== 'object') {
    return shell(
      <>
        <h1 className={styles.h2}>No encontramos tu inscripción</h1>
        <p>Si ya pagaste, quedate tranquilo: te llega la confirmación por mail. Si no te llega en unos minutos, escribinos.</p>
        <p>
          <a className={`${styles.btn} ${styles.btnDark}`} href={WHATSAPP} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
        </p>
      </>,
    )
  }

  const m = enrollment.masterclass
  const info = classInfo(m, enrollment.token)
  const date = argDate(m.startsAt)
  const status = one(params.collection_status) || one(params.status)

  if (enrollment.status === 'pagada') {
    return shell(
      <>
        <PurchaseTracker eventId={`purchase-${enrollment.token}`} value={enrollment.amount ?? 0} />
        <p className={styles.label} style={{ color: '#a63fa2' }}>
          Entrada confirmada · Lugar n.º {enrollment.seat}
        </p>
        <h1 className={styles.h2}>¡Listo, {enrollment.name.split(' ')[0]}! Tu lugar está reservado.</h1>
        <p>
          Te esperamos el {date.long} a las {date.time} (hora Argentina) en Google Meet. Te mandamos la confirmación a{' '}
          <strong>{enrollment.email}</strong>, con el enlace y la invitación para tu calendario.
        </p>
        <p style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a className={`${styles.btn} ${styles.btnDark}`} href={info.calendarUrl} target="_blank" rel="noopener noreferrer">
            Agregar a Google Calendar
          </a>
          <a className={styles.btn} href={info.icsUrl}>
            Descargar para otro calendario
          </a>
        </p>
        <h2>Qué sigue</h2>
        <ul>
          <li>Pagaste {pesos(enrollment.amount ?? 0)}. La factura C te llega por mail en los próximos días.</li>
          <li>Te recordamos la clase 24 horas y 1 hora antes, con el enlace.</li>
          <li>Para practicar a la par, tené a mano una computadora y tu cuenta de Google.</li>
        </ul>
        <p>
          ¿Una duda?{' '}
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
            Escribinos por WhatsApp
          </a>
          .
        </p>
      </>,
    )
  }

  if (enrollment.status === 'rechazada' || status === 'rejected' || status === 'null' || status === 'failure') {
    return shell(
      <>
        <h1 className={styles.h2}>El pago no se completó</h1>
        <p>
          No te cobramos nada. Podés intentar de nuevo con otra tarjeta o con dinero en cuenta de Mercado Pago: tus datos ya
          quedan cargados.
        </p>
        <p style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a className={`${styles.btn} ${styles.btnDark}`} href={`${LANDING_PATH}#reservar`}>
            Intentar de nuevo
          </a>
          <a className={styles.btn} href={WHATSAPP} target="_blank" rel="noopener noreferrer">
            Pedir ayuda por WhatsApp
          </a>
        </p>
      </>,
    )
  }

  return shell(
    <>
      <h1 className={styles.h2}>Tu pago está en proceso</h1>
      <p>
        Mercado Pago todavía no lo confirmó. Apenas lo haga, te llega un mail a <strong>{enrollment.email}</strong> con tu entrada
        y el enlace de la clase. Suele tardar unos minutos.
      </p>
      <p>
        <a className={styles.btn} href={WHATSAPP} target="_blank" rel="noopener noreferrer">
          Consultar por WhatsApp
        </a>
      </p>
    </>,
  )
}
