import { offer } from '@/lib/masterclass/model'
import styles from './ia.module.css'

type Offer = ReturnType<typeof offer>

/** A cut paper edge, drawn as a filled shape: zigzag for the menu sheet, scallops for the back of the card. */
export function Edge({ kind, side, color }: { kind: 'zigzag' | 'scallop'; side: 'top' | 'bottom'; color: string }) {
  const id = `edge-${kind}-${side}`
  const w = kind === 'zigzag' ? 24 : 56
  const h = kind === 'zigzag' ? 12 : 20
  const path =
    kind === 'zigzag'
      ? side === 'top'
        ? `M0 ${h} L${w / 2} 0 L${w} ${h} Z`
        : `M0 0 L${w / 2} ${h} L${w} 0 Z`
      : side === 'top'
        ? `M0 ${h} A${w / 2} ${h} 0 0 1 ${w} ${h} Z`
        : `M0 0 A${w / 2} ${h} 0 0 0 ${w} 0 Z`
  return (
    <svg className={styles.edge} style={{ height: h }} aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse">
          <path d={path} fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height={h} fill={`url(#${id})`} />
    </svg>
  )
}

/** Every seat as a node: the taken ones in ink, the free ones in Magenta. The numbers are the real ones. */
export function SeatDots({ seats }: { seats: Offer }) {
  const taken = seats.total - seats.left
  return (
    <span className={styles.seatRow} aria-hidden="true">
      {Array.from({ length: seats.total }, (_, i) => (
        <i key={i} data-free={i >= taken || undefined} />
      ))}
    </span>
  )
}

/** What the counter says. Honest in every state: launch seats, plain seats, released seats, full or closed. */
export function seatsLine(seats: Offer & { closed: boolean }, fmt: (n: number) => string) {
  if (seats.closed) return 'Inscripciones cerradas'
  if (seats.soldOut) return 'Cupo completo'
  if (seats.launchLeft > 0) {
    return `Quedan ${seats.launchLeft} ${seats.launchLeft === 1 ? 'lugar' : 'lugares'} a ${fmt(seats.price)}`
  }
  const opened = seats.released > 0 ? `Abrimos ${seats.released} lugares más. ` : ''
  return `${opened}Quedan ${seats.left} de ${seats.total} lugares`
}

export function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.25-8.24 8.25Zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28Z" />
    </svg>
  )
}
