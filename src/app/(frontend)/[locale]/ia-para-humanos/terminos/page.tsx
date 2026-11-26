import type { Metadata } from 'next'
import { Logo } from '@/components/ia-humanos/logo'
import styles from '@/components/ia-humanos/ia.module.css'
import { site } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Términos y condiciones · IA para Humanos' } }

/** The terms of sale of the masterclasses. To be reviewed by the accountant or a lawyer before launch. */
export default function TermsPage() {
  return (
    <main id="contenido" className={styles.paperWrap}>
      <header className={styles.bar} style={{ padding: '0 0 24px' }}>
        <a href="/ia-para-humanos" aria-label="Volver a la masterclass">
          <Logo />
        </a>
      </header>
      <article className={styles.paper}>
        <h1 className={styles.h2}>Términos y condiciones</h1>
        <p>
          Las masterclasses de IA para Humanos las organiza y cobra Exacta, de {site.legalName}, CUIT {site.cuit}, con domicilio
          en {site.city}. Contacto: {site.email} y WhatsApp {site.phoneDisplay}.
        </p>
        <h2>Qué comprás</h2>
        <p>
          Una entrada personal para la clase en vivo por Google Meet en el día y horario publicados, la grabación con acceso sin
          vencimiento y los materiales que se indican en la página: guía de herramientas, 50 instrucciones, plan de 7 días y
          certificado de Exacta.
        </p>
        <h2>Precio y pago</h2>
        <p>
          El precio es el que figura al momento de inscribirte, en pesos argentinos y con impuestos incluidos. Se paga con Mercado
          Pago: tarjeta de crédito (en cuotas, con el interés que indique Mercado Pago), débito o dinero en cuenta. Emitimos
          factura C.
        </p>
        <h2>Lugares</h2>
        <p>
          El cupo es limitado. Mientras pagás, tu lugar queda reservado 30 minutos. El lugar es tuyo cuando Mercado Pago confirma
          el pago y te llega el mail de confirmación.
        </p>
        <h2>Arrepentimiento</h2>
        <p>
          Podés arrepentirte de la compra dentro de los 10 días corridos desde que pagaste, sin dar motivos, desde el{' '}
          <a href="/ia-para-humanos/arrepentimiento">botón de arrepentimiento</a>. Te damos un código de trámite y te devolvemos
          el dinero por el mismo medio de pago.
        </p>
        <h2>Si cambia la fecha</h2>
        <p>
          Si por un motivo de fuerza mayor tenemos que mover la clase, te avisamos por mail y WhatsApp con la nueva fecha. Si no
          te sirve, te devolvemos el total.
        </p>
        <h2>Uso de los materiales</h2>
        <p>La grabación y los materiales son para tu uso personal. No se pueden revender ni publicar.</p>
        <h2>Tus datos</h2>
        <p>
          Usamos tu nombre, email y WhatsApp solo para la inscripción, los recordatorios y la factura. Más detalle en la{' '}
          <a href="/privacidad">política de privacidad</a>.
        </p>
      </article>
    </main>
  )
}
