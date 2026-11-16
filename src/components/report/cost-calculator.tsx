'use client'

import { useState } from 'react'
import { monthlyLoss, type Calculator } from '@/lib/prospecting/calculators'

const money = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`

/**
 * The cost of the problem with the reader's own numbers. Money starts empty: we never guess what they charge.
 * The written formula stays below, so the page still says how to do the math if the script doesn't load.
 */
export function CostCalculator({
  calculator,
  formula,
  price,
}: {
  calculator: Calculator
  formula: string
  /** The proposal's reference price in pesos, to say how many lost units it's worth. */
  price?: { amount: number; period: 'mes' | 'unico' } | null
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(calculator.inputs.map((i) => [i.key, i.example !== undefined ? String(i.example) : ''])),
  )
  const numbers = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v.replace(/\D/g, '')) || 0]))
  const missingMoney = calculator.inputs.some((i) => i.money && !numbers[i.key])
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
                onChange={(e) => setValues((v) => ({ ...v, [input.key]: e.target.value.replace(/[^\d.]/g, '') }))}
                className="w-full bg-transparent px-3 py-3 font-mono text-base text-ink outline-none"
              />
            </span>
          </label>
        ))}
      </div>
      <div className="mt-6 border-l-2 border-gold pl-5" aria-live="polite">
        {loss > 0 ? (
          <>
            <p className="text-ink-soft">Con tus números, hoy se pierden cerca de</p>
            <p className="mt-1 font-mono text-3xl text-gold">{money(loss)} por mes</p>
            <p className="mt-1 text-ink-soft">{money(loss * 12)} por año.</p>
            {units > 0 && calculator.unit && (
              <p className="mt-3 text-ink">
                La propuesta cuesta desde {money(price!.amount)}
                {price!.period === 'mes' ? ' por mes' : ', una sola vez'}: lo mismo que{' '}
                {units === 1 ? calculator.unit.singular : `${units} ${calculator.unit.plural}`}.
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
