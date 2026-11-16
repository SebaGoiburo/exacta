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

test('AI cost uses each model price and halves tokens in a batch, not searches', async () => {
  const { costOf } = await import('../src/lib/ai-usage')
  const usage = { input_tokens: 1_000_000, output_tokens: 100_000, server_tool_use: { web_search_requests: 3 } }
  // Sonnet 5.5: US$2 in + US$1 out + US$0.03 of searches.
  assert.equal(costOf({ model: 'claude-sonnet-5-5', usage }), 3.03)
  assert.equal(costOf({ model: 'claude-sonnet-5-5', usage }, { batch: true }), 1.53)
  // Haiku 5.5: US$0.10 in + US$0.05 out + searches.
  assert.equal(costOf({ model: 'claude-haiku-5-5', usage }), 0.18)
  // Without usage there is nothing to charge.
  assert.equal(costOf({ error: { message: 'x' } }), 0)
})
