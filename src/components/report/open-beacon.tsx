'use client'

import { useEffect } from 'react'

/** Tells us the report was really read: only after a few seconds on screen, and once per visit. */
export function OpenBeacon({ token }: { token: string }) {
  useEffect(() => {
    let sent = false
    const send = () => {
      if (sent || document.visibilityState !== 'visible') return
      sent = true
      void fetch('/api/informe/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        keepalive: true,
      }).catch(() => undefined)
    }
    const timer = window.setTimeout(send, 4000)
    return () => window.clearTimeout(timer)
  }, [token])
  return null
}
