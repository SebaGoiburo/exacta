/*
 * The reference price of a proposal step, as the report writes it. Shared by the report page and the
 * editor, so what the team picks is exactly what the reader sees.
 *
 * One number is typed by hand: the list price, which is what the client pays in 3 interest-free
 * installments. Everything else (the installment, the transfer price, 6 installments with a surcharge)
 * comes from it and from the payment terms in Ajustes.
 */

/** The payment terms and Mercado Pago's fees, from Ajustes. Fees are before VAT, as Mercado Pago shows them. */
export type PaymentTerms = {
  transferDiscount: number
  sixSurcharge: number
  mpCharge: number
  mpThree: number
  mpSix: number
  vat: number
}

/** Mercado Pago's simulator on 2026-11-16. */
export const DEFAULT_TERMS: PaymentTerms = {
  transferDiscount: 10,
  sixSurcharge: 13,
  mpCharge: 1.53,
  mpThree: 10.49,
  mpSix: 18.69,
  vat: 21,
}

/** Ajustes as stored; an empty field keeps the default. */
type TermsSettings = {
  payTransferDiscount?: number | null
  paySixSurcharge?: number | null
  mpFeeCharge?: number | null
  mpFeeThree?: number | null
  mpFeeSix?: number | null
  mpVat?: number | null
}

export function termsFrom(settings: TermsSettings | null | undefined): PaymentTerms {
  const pick = (v: number | null | undefined, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
  return {
    transferDiscount: pick(settings?.payTransferDiscount, DEFAULT_TERMS.transferDiscount),
    sixSurcharge: pick(settings?.paySixSurcharge, DEFAULT_TERMS.sixSurcharge),
    mpCharge: pick(settings?.mpFeeCharge, DEFAULT_TERMS.mpCharge),
    mpThree: pick(settings?.mpFeeThree, DEFAULT_TERMS.mpThree),
    mpSix: pick(settings?.mpFeeSix, DEFAULT_TERMS.mpSix),
    vat: pick(settings?.mpVat, DEFAULT_TERMS.vat),
  }
}

export const PAYMENT_OPTIONS = {
  cuotas3: '3 cuotas sin interés',
  transferencia: 'Transferencia con descuento',
  cuotas6: '6 cuotas con recargo',
} as const
export type PaymentOption = keyof typeof PAYMENT_OPTIONS

/** A reference price. Only the team sets it; the report never makes one up. */
export type OfferPrice = {
  /** What the client pays in 3 interest-free installments. */
  list: number
  currency: 'ARS' | 'USD'
  /** Whether it starts with "Desde". */
  from?: boolean
  /** Which ways to pay the report shows; the first one shown is the main line. */
  show: Record<PaymentOption, boolean>
  /** A fixed monthly charge, apart from the one-off price. */
  monthly?: number | null
  /** What the monthly charge is for: "de mantenimiento". */
  monthlyLabel?: string
}

/** Prices saved before installments existed: an amount and one phrase after it. */
export type LegacyPrice = {
  amount: number
  currency: 'ARS' | 'USD'
  period: 'mes' | 'unico' | 'cuotas3' | 'cuotas6' | 'ninguna'
  from?: boolean
}

export type AnyPrice = OfferPrice | LegacyPrice
export const isLegacyPrice = (p: AnyPrice): p is LegacyPrice => !('list' in p)

const money = (n: number, currency: 'ARS' | 'USD') => `${currency === 'USD' ? 'US$' : '$'} ${n.toLocaleString('es-AR')}`
/** Pesos round to the thousand and dollars to the ten, so the report never shows $ 99.833. */
const step = (currency: 'ARS' | 'USD') => (currency === 'USD' ? 10 : 1000)
const up = (n: number, s: number) => Math.ceil(n / s) * s
const near = (n: number, s: number) => Math.round(n / s) * s

/** The amounts behind each way to pay. Installments round up, so their total never falls short of the list price. */
export function paymentAmounts(p: OfferPrice, terms: PaymentTerms = DEFAULT_TERMS) {
  const s = step(p.currency)
  const three = up(p.list / 3, s)
  const six = up((p.list * (1 + terms.sixSurcharge / 100)) / 6, s)
  return {
    three,
    threeTotal: three * 3,
    transfer: near(p.list * (1 - terms.transferDiscount / 100), s),
    six,
    sixTotal: six * 6,
  }
}

/** The lines the report shows, main one first. */
export function priceLines(p: AnyPrice, terms: PaymentTerms = DEFAULT_TERMS) {
  if (isLegacyPrice(p)) return { from: p.from !== false, main: legacyText(p), others: [] as string[], monthly: '' }
  const monthly = p.monthly ? `${money(p.monthly, p.currency)} por mes${p.monthlyLabel ? ` ${p.monthlyLabel}` : ''}` : ''
  // A service that is only a monthly charge, like running the ads.
  if (!p.list) return { from: p.from !== false, main: monthly, others: [] as string[], monthly: '' }
  const a = paymentAmounts(p, terms)
  const lines: string[] = []
  if (p.show.cuotas3) lines.push(`3 cuotas sin interés de ${money(a.three, p.currency)}`)
  if (p.show.transferencia) lines.push(`${money(a.transfer, p.currency)} por transferencia (${terms.transferDiscount}% OFF)`)
  if (p.show.cuotas6) lines.push(`6 cuotas de ${money(a.six, p.currency)} (total ${money(a.sixTotal, p.currency)})`)
  // With nothing ticked, the list price alone.
  const [main = money(p.list, p.currency), ...rest] = lines
  return {
    from: p.from !== false,
    main,
    others: rest.map((l) => `o ${l}`),
    monthly: monthly ? `+ ${monthly}` : '',
  }
}

/** The whole price in one line, for previews: "Desde 3 cuotas sin interés de $ 300.000 · o …". */
export function priceText(p: AnyPrice, terms: PaymentTerms = DEFAULT_TERMS) {
  const l = priceLines(p, terms)
  return [`${l.from ? 'Desde ' : ''}${l.main}`, ...l.others, l.monthly].filter(Boolean).join(' · ')
}

/**
 * For the cost calculator: the amount the reader pays at a time and how to say it, so it's compared with
 * what they lose each month. In installments, that's one installment.
 */
export function calculatorPrice(p: AnyPrice, terms: PaymentTerms = DEFAULT_TERMS) {
  if (p.currency !== 'ARS') return null
  const from = p.from !== false ? 'desde ' : ''
  if (isLegacyPrice(p)) return { amount: p.amount, lead: `La propuesta cuesta ${legacyText(p, true)}: lo mismo que` }
  if (!p.list)
    return p.monthly
      ? { amount: p.monthly, lead: `La propuesta cuesta ${from}${money(p.monthly, 'ARS')} por mes: lo mismo que` }
      : null
  const a = paymentAmounts(p, terms)
  if (p.show.cuotas3) return { amount: a.three, lead: `Cada cuota, ${from}${money(a.three, 'ARS')}, equivale a` }
  if (p.show.transferencia)
    return { amount: a.transfer, lead: `La propuesta cuesta ${from}${money(a.transfer, 'ARS')}: lo mismo que` }
  return { amount: p.list, lead: `La propuesta cuesta ${from}${money(p.list, 'ARS')}: lo mismo que` }
}

/** What Exacta keeps from each way to pay after Mercado Pago's fees and VAT. Shown in the panel only. */
export function netAmounts(p: OfferPrice, terms: PaymentTerms = DEFAULT_TERMS) {
  const a = paymentAmounts(p, terms)
  const keep = (total: number, fee: number) => Math.round(total * (1 - ((terms.mpCharge + fee) * (1 + terms.vat / 100)) / 100))
  return { three: keep(a.threeTotal, terms.mpThree), transfer: a.transfer, six: keep(a.sixTotal, terms.mpSix) }
}

const LEGACY_SUFFIX: Record<LegacyPrice['period'], string> = {
  mes: ' por mes',
  unico: ', pago único',
  cuotas3: ' en 3 cuotas sin interés',
  cuotas6: ' en 6 cuotas sin interés',
  ninguna: '',
}

function legacyText(p: LegacyPrice, midSentence = false) {
  const from = midSentence && p.from !== false ? 'desde ' : ''
  return `${from}${money(p.amount, p.currency)}${LEGACY_SUFFIX[p.period] ?? ''}`
}
