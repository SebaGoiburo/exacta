import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculatorFor, monthlyLoss } from '../src/lib/prospecting/calculators'

test('the booking calculator adds lost appointments and admin hours per month', () => {
  const calculator = calculatorFor('turnos-online')!
  // 3 lost appointments of $20.000 and 6 hours of $5.000 a week, over 4.3 weeks.
  const loss = monthlyLoss(calculator, { turnos: 3, consulta: 20000, horas: 6, hora: 5000 })
  assert.equal(Math.round(loss), Math.round((3 * 20000 + 6 * 5000) * 4.3))
})

test('a missing value counts as zero, never as a guess', () => {
  const calculator = calculatorFor('turnos-online')!
  assert.equal(monthlyLoss(calculator, { turnos: 3, horas: 6 }), 0)
})

test('offers without a calculator keep the written formula', () => {
  assert.equal(calculatorFor('ecommerce'), null)
  assert.equal(calculatorFor(null), null)
  assert.ok(calculatorFor('otra-cosa', 'sitio-web'))
})
