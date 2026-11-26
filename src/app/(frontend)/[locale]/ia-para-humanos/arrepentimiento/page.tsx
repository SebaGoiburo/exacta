import type { Metadata } from 'next'
import { Logo } from '@/components/ia-humanos/logo'
import { WithdrawalForm } from '@/components/ia-humanos/withdrawal-form'
import styles from '@/components/ia-humanos/ia.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: { absolute: 'Botón de arrepentimiento · IA para Humanos' } }

/** The withdrawal button required by Argentine consumer rules for online sales. */
export default function WithdrawalPage() {
  return (
    <main id="contenido" className={styles.paperWrap}>
      <header className={styles.bar} style={{ padding: '0 0 24px' }}>
        <a href="/ia-para-humanos" aria-label="Volver a la masterclass">
          <Logo />
        </a>
      </header>
      <article className={styles.paper}>
        <h1 className={styles.h2}>Botón de arrepentimiento</h1>
        <p>
          Si compraste una entrada en los últimos 10 días y te arrepentiste, completá tus datos. Te damos un código de trámite al
          instante y te devolvemos el dinero por el mismo medio de pago.
        </p>
        <WithdrawalForm />
      </article>
    </main>
  )
}
