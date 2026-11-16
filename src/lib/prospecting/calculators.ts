/*
 * The cost calculator a report shows instead of the written formula, for the offers that have one.
 * The reader puts in their own numbers: we never fill in money we don't know.
 */

export type CalculatorInput = {
  key: string
  label: string
  /** Money fields start empty; counts start with a modest example the reader is invited to change. */
  money?: boolean
  example?: number
}

export type Calculator = {
  inputs: CalculatorInput[]
  /** Monthly loss: the sum of each term's inputs multiplied together, times its factor. */
  terms: { keys: string[]; factor: number }[]
  /** The input that prices one lost unit, to say how many of them a monthly price is worth. */
  unit?: { key: string; singular: string; plural: string }
}

const WEEKS_PER_MONTH = 4.3

const CALCULATORS: Record<string, Calculator> = {
  'turnos-online': {
    inputs: [
      { key: 'turnos', label: 'Turnos por semana que se cancelan sobre la hora o quedan vacíos', example: 3 },
      { key: 'consulta', label: 'Valor de una consulta', money: true },
      { key: 'horas', label: 'Horas por semana dando, confirmando y moviendo turnos', example: 6 },
      { key: 'hora', label: 'Valor de una hora de quien atiende los turnos', money: true },
    ],
    terms: [
      { keys: ['turnos', 'consulta'], factor: WEEKS_PER_MONTH },
      { keys: ['horas', 'hora'], factor: WEEKS_PER_MONTH },
    ],
    unit: { key: 'consulta', singular: 'una consulta', plural: 'consultas' },
  },
  'sitio-web': {
    inputs: [
      { key: 'consultas', label: 'Consultas por mes que hoy no te llegan', example: 10 },
      { key: 'cierre', label: 'De cada 10 consultas, cuántas se vuelven clientes', example: 3 },
      { key: 'ticket', label: 'Lo que deja en promedio un cliente nuevo', money: true },
    ],
    terms: [{ keys: ['consultas', 'cierre', 'ticket'], factor: 0.1 }],
    unit: { key: 'ticket', singular: 'un cliente nuevo', plural: 'clientes nuevos' },
  },
}

/** The offer's calculator, or its parent's (a variant like turnos-online inherits from sitio-web if it has none). */
export function calculatorFor(key?: string | null, parentKey?: string | null): Calculator | null {
  return (key && CALCULATORS[key]) || (parentKey && CALCULATORS[parentKey]) || null
}

export function monthlyLoss(calculator: Calculator, values: Record<string, number>) {
  return calculator.terms.reduce((sum, t) => sum + t.keys.reduce((product, k) => product * (values[k] || 0), 1) * t.factor, 0)
}
