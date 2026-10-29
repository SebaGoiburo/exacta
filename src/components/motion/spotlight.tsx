'use client'

import { useCallback } from 'react'

/** Feeds the pointer position to `.reg-card` children as --mx / --my. */
export function SpotlightGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.reg-card')
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${e.clientX - r.left}px`)
    card.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])

  return (
    <div className={className} onPointerMove={onMove}>
      {children}
    </div>
  )
}

export function RegMarks() {
  return (
    <>
      <span className="reg-mark" data-c="tl" aria-hidden />
      <span className="reg-mark" data-c="tr" aria-hidden />
      <span className="reg-mark" data-c="bl" aria-hidden />
      <span className="reg-mark" data-c="br" aria-hidden />
    </>
  )
}
