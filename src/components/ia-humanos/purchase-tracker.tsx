'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

/** Reports the purchase to Meta once per enrollment, even if the thank-you page is opened again. */
export function PurchaseTracker({ eventId, value }: { eventId: string; value: number }) {
  useEffect(() => {
    const key = `iah-${eventId}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      // Without storage it may count twice on a reload; better than not counting.
    }
    track('purchase', { value, currency: 'ARS', content_name: 'Masterclass IA para Humanos' }, eventId)
    try {
      sessionStorage.removeItem('iah-enroll')
    } catch {
      // Nothing to clean.
    }
  }, [eventId, value])
  return null
}
