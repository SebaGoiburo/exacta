'use client'

import { useState } from 'react'
import { faqs } from '@/content/ia-humanos'
import styles from './ia.module.css'

/** Questions filed like index cards: one open at a time, the first open on arrival. */
export function FaqCards() {
  const [open, setOpen] = useState(0)
  return (
    <div className={styles.cards}>
      {faqs.items.map((f, i) => (
        <div
          key={f.q}
          className={styles.card}
          data-open={i === open || undefined}
          style={{ '--i': i % 4, zIndex: i } as React.CSSProperties}
        >
          <button
            type="button"
            className={styles.cardBtn}
            aria-expanded={i === open}
            aria-controls={`iah-faq-${i}`}
            onClick={() => setOpen(i === open ? -1 : i)}
          >
            <span className={styles.cardTab}>{f.tab}</span>
            <span className={styles.cardQ}>
              {f.q}
              <span className={styles.plus} aria-hidden="true">
                +
              </span>
            </span>
          </button>
          <div id={`iah-faq-${i}`} className={styles.cardA} hidden={i !== open}>
            {f.a}
          </div>
        </div>
      ))}
    </div>
  )
}
