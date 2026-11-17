'use client'

import { useState } from 'react'
import { monthlyLoss, type Calculator } from '@/lib/prospecting/calculators'

const money = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`

/**
 * The cost of the problem with the reader's own numbers. It starts with an example, said to be one, so the
 * result shows without typing anything. The written formula stays below, in case the script doesn't load.
 */
export function CostCalculator({
  calculator,
  formula,
  price,
  example,
}: {
  calculator: Calculator
  formula: string
  /** The team's example for the unit's value (one appointment, one client), instead of the calculator's own. */
  example?: number | null
  /**
   * What the reader pays at a time, in pesos (one installment, when it's in installments), and the start of
   * the sentence that says how many lost units it's worth.
   */
  price?: { amount: number; lead: string } | null
}) {
  const startsWith = (i: Calculator['inputs'][number]) => (i.key === calculator.unit?.key && example ? example : i.example)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      calculator.inputs.map((i) => {
        const value = startsWith(i)
        return [i.key, value !== undefined ? value.toLocaleString('es-AR') : '']
      }),
    ),
  )
  const numbers = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v.replace(/\D/g, '')) || 0]))
  const missingMoney = calculator.inputs.some((i) => i.money && !i.optional && !numbers[i.key])
  const exampleMoney = calculator.inputs.find((i) => i.money && startsWith(i))
  const loss = missingMoney ? 0 : monthlyLoss(calculator, numbers)
  const unitValue = calculator.unit ? numbers[calculator.unit.key] : 0
  const units = price && unitValue ? Math.ceil(price.amount / unitValue) : 0

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {calculator.inputs.map((input) => (
          <label key={input.key} className="grid gap-2 text-sm text-ink-soft">
            {input.label}
            <span className="flex items-center border border-line-strong bg-bg-elev focus-within:border-ink">
              {input.money && <span className="pl-3 font-mono text-ink-soft">$</span>}
              <input
                inputMode="numeric"
                value={values[input.key]}
                placeholder={input.money ? 'Tu valor' : undefined}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '')
                  setValues((v) => ({ ...v, [input.key]: digits ? Number(digits).toLocaleString('es-AR') : '' }))
                }}
                className="w-full bg-transparent px-3 py-3 font-mono text-base text-ink outline-none"
              />
            </span>
          </label>
        ))}
      </div>
      {exampleMoney && (
        <p className="mt-3 text-sm text-ink-soft">
          Cargamos de ejemplo {money(startsWith(exampleMoney)!)} por {exampleMoney.label.replace(/^Valor de /, '')}: cambialo por
          lo que cobrás vos.
        </p>
      )}
      <div className="mt-6 border-l-2 border-gold pl-5" aria-live="polite">
        {loss > 0 ? (
          <>
            <p className="text-ink-soft">Con estos números, hoy se pierden cerca de</p>
            <p className="mt-1 font-mono text-3xl text-gold">{money(loss)} por mes</p>
            <p className="mt-1 text-ink-soft">{money(loss * 12)} por año.</p>
            {units > 0 && calculator.unit && (
              <p className="mt-3 text-ink">
                {price!.lead} {units === 1 ? calculator.unit.singular : `${units} ${calculator.unit.plural}`}.
              </p>
            )}
          </>
        ) : (
          <p className="text-ink-soft">Completá los valores en pesos y te mostramos cuánto se pierde por mes.</p>
        )}
      </div>
      <p className="mt-4 text-sm text-ink-soft">Cómo se calcula: {formula}</p>
    </div>
  )
}
