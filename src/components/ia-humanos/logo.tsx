import styles from './ia.module.css'

/** The isotype from the brand manual: a person drawn with Exacta's nodes. The head is Menta on dark grounds, Magenta on light. */
export function Isotipo({
  className,
  head = '#8FE3C2',
  body = 'currentColor',
}: {
  className?: string
  head?: string
  body?: string
}) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <g stroke={body} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="24" y1="12.5" x2="24" y2="16.5" />
        <polyline points="14,32.5 16,24 24,16.5 32,24 34,32.5" />
        <polyline points="24,16.5 24,24.5 24,32.5" />
        <polyline points="16.5,45.5 19.5,39 24,32.5 28.5,39 31.5,45.5" />
      </g>
      <g fill={body}>
        {[
          [14, 32.5],
          [16, 24],
          [24, 16.5],
          [32, 24],
          [34, 32.5],
          [24, 24.5],
          [24, 32.5],
          [19.5, 39],
          [28.5, 39],
          [16.5, 45.5],
          [31.5, 45.5],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.3" />
        ))}
      </g>
      <circle cx="24" cy="7.5" r="5" fill={head} />
    </svg>
  )
}

/** The horizontal logo. "Una unidad de Exacta" is dropped below 220 px, as the manual says. */
export function Logo({ tone = 'dark', endorsed = true }: { tone?: 'dark' | 'light'; endorsed?: boolean }) {
  return (
    <span
      className={`${styles.logo} ${tone === 'light' ? styles.logoLight : ''}`}
      role="img"
      aria-label="Inteligencia Artificial para Humanos, una unidad de Exacta"
    >
      <Isotipo className={styles.logoIso} head={tone === 'light' ? '#CC57C7' : '#8FE3C2'} />
      <span className={styles.logoText} aria-hidden="true">
        <span className={styles.logoS1}>Inteligencia Artificial para</span>
        <span className={styles.logoS2}>Humanos</span>
        {endorsed && <span className={styles.logoS3}>Una unidad de Exacta</span>}
      </span>
    </span>
  )
}
