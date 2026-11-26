'use client'

import { useState } from 'react'
import { audiences } from '@/content/ia-humanos'
import styles from './ia.module.css'

/** Pick your line of work: its benefit, its photo and one of the 50 instructions from the class, ready to copy. */
export function Audiences() {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState<number | null>(null)
  const item = audiences.items[active]

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (active + step + audiences.items.length) % audiences.items.length
    setActive(next)
    document.getElementById(`iah-tab-${audiences.items[next].key}`)?.focus()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.instruction)
      setCopied(active)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      // Without clipboard access the text is still there to select by hand.
    }
  }

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Elegí tu rubro" onKeyDown={onKey}>
        {audiences.items.map((a, i) => (
          <button
            key={a.key}
            id={`iah-tab-${a.key}`}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={i === active}
            aria-controls="iah-aud-panel"
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >
            {a.name}
          </button>
        ))}
      </div>
      <div className={styles.audBody} id="iah-aud-panel" role="tabpanel" aria-labelledby={`iah-tab-${item.key}`}>
        <div className={styles.audText}>
          <p className={styles.benefit}>{item.benefit}</p>
          <div className={styles.prompt}>
            <p className={`${styles.label} ${styles.promptHint}`}>{audiences.sample}</p>
            <p className={styles.promptText}>{item.instruction}</p>
            <div className={styles.promptActions}>
              <button type="button" className={styles.btn} onClick={copy}>
                Copiar instrucción
              </button>
              <span className={styles.copied} role="status" aria-live="polite">
                {copied === active ? 'Copiada. Pegala en ChatGPT o Gemini.' : ''}
              </span>
            </div>
          </div>
        </div>
        <figure className={`${styles.figure} ${styles.audPhoto}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/ia-para-humanos/${item.photo}.webp`} alt={item.photoAlt} loading="lazy" />
        </figure>
      </div>
    </>
  )
}
