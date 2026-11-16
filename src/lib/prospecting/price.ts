/*
 * The reference price of a proposal step, as the report writes it. Shared by the report page and the
 * editor, so what the team picks is exactly what the reader sees.
 */

/** What follows the amount. "ninguna" leaves the amount alone. */
export const PRICE_PERIODS = {
  mes: 'por mes',
  unico: 'pago único',
  cuotas3: '3 cuotas sin interés',
  cuotas6: '6 cuotas sin interés',
  ninguna: 'Sin frase',
} as const
export type PricePeriod = keyof typeof PRICE_PERIODS

/** A reference price. Only the team sets it; the report never makes one up. */
export type OfferPrice = {
  amount: number
  currency: 'ARS' | 'USD'
  period: PricePeriod
  /** Whether it starts with "Desde". Prices saved before this option existed had it. */
  from?: boolean
}

const SUFFIX: Record<PricePeriod, string> = {
  mes: ' por mes',
  unico: ', pago único',
  cuotas3: ' en 3 cuotas sin interés',
  cuotas6: ' en 6 cuotas sin interés',
  ninguna: '',
}

export const isPricePeriod = (v: unknown): v is PricePeriod => typeof v === 'string' && v in PRICE_PERIODS

/** "Desde $ 300.000 por mes", or without "Desde": "$ 300.000 en 3 cuotas sin interés". */
export function priceText(p: OfferPrice, opts: { midSentence?: boolean } = {}) {
  const amount = `${p.currency === 'USD' ? 'US$' : '$'} ${p.amount.toLocaleString('es-AR')}`
  const from = p.from === false ? '' : opts.midSentence ? 'desde ' : 'Desde '
  return `${from}${amount}${SUFFIX[isPricePeriod(p.period) ? p.period : 'mes']}`
}
