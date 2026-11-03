import assert from 'node:assert/strict'
import { test } from 'node:test'
import { businessStatus } from '../src/lib/business-hours'
import { buildLlmRequest, buildState, mergeCollected, parseAgentOutput, toLlmMessages } from '../src/lib/whatsapp/prompt'

// Mendoza is UTC-3 all year. 2026-11-02 is a Monday.
const at = (iso: string) => businessStatus(new Date(iso))

test('open from 8:00 to 19:30 on weekdays', () => {
  assert.equal(at('2026-11-02T11:00:00Z').open, true) // Monday 8:00
  assert.equal(at('2026-11-02T22:29:00Z').open, true) // Monday 19:29
  assert.equal(at('2026-11-02T22:30:00Z').open, false) // Monday 19:30
  assert.equal(at('2026-11-06T22:00:00Z').open, true) // Friday 19:00
})

test('next opening reads right on every closed moment', () => {
  assert.equal(at('2026-11-03T06:00:00Z').nextOpening, 'hoy a las 8:00') // Tuesday 3:00
  assert.equal(at('2026-11-03T23:00:00Z').nextOpening, 'mañana a las 8:00') // Tuesday 20:00
  assert.equal(at('2026-11-06T23:00:00Z').nextOpening, 'el lunes a las 8:00') // Friday 20:00
  assert.equal(at('2026-11-07T15:00:00Z').nextOpening, 'el lunes a las 8:00') // Saturday 12:00
  assert.equal(at('2026-11-08T15:00:00Z').nextOpening, 'mañana a las 8:00') // Sunday 12:00
})

test('the state never promises minutes outside hours', () => {
  const closed = buildState({ open: false, nextOpening: 'el lunes a las 8:00' }, {})
  assert.match(closed, /el lunes a las 8:00/)
  assert.match(closed, /No digas que lo atienden en minutos/)
  assert.match(buildState({ open: true, nextOpening: '' }, {}), /en unos minutos/)
})

test('the model only sees a conversation that starts with the person', () => {
  const messages = toLlmMessages([
    { sender: 'asesor', text: 'Hola' },
    { sender: 'sistema', text: 'nota' },
    { sender: 'cliente', text: 'Buenas' },
    { sender: 'agente', text: 'Hola, soy el asistente' },
  ])
  assert.deepEqual(messages.map((m) => m.role), ['user', 'assistant'])
  assert.deepEqual(toLlmMessages([{ sender: 'agente', text: 'Hola' }]), [])
})

test('stable instructions come before the state that changes', () => {
  const request = buildLlmRequest({
    knowledge: 'Hacemos software',
    status: { open: true, nextOpening: '' },
    collected: { name: 'Ana' },
    history: [{ sender: 'cliente', text: 'Hola' }],
  })
  assert.match(request.system[0].text, /Hacemos software/)
  assert.ok(request.system[0].cache_control)
  assert.equal(request.system[1].cache_control, undefined)
  assert.match(request.system[1].text, /name: Ana/)
})

const reply = (content: unknown, extra = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: typeof content === 'string' ? content : JSON.stringify(content) }],
  ...extra,
})

test('reads a valid answer and drops empty fields', () => {
  const output = parseAgentOutput(
    reply({ reply: ' Hola ', handoff: true, collected: { name: 'Ana', email: '', company: ' Bodega ' } }),
  )
  assert.deepEqual(output, { reply: 'Hola', handoff: true, collected: { name: 'Ana', company: 'Bodega' } })
})

test('anything unusable goes to a person', () => {
  assert.equal(parseAgentOutput(null), null)
  assert.equal(parseAgentOutput({ error: { message: 'unauthorized' } }), null)
  assert.equal(parseAgentOutput(reply('no es json')), null)
  assert.equal(parseAgentOutput(reply({ reply: '', handoff: false, collected: {} })), null)
  assert.equal(parseAgentOutput(reply({ reply: 'x', handoff: false, collected: {} }, { stop_reason: 'refusal' })), null)
  assert.equal(parseAgentOutput(reply({ reply: 'x', handoff: false, collected: {} }, { stop_reason: 'max_tokens' })), null)
})

test('handoff only counts when it is exactly true', () => {
  assert.equal(parseAgentOutput(reply({ reply: 'x', handoff: 'true', collected: {} }))?.handoff, false)
})

test('merging keeps known data and rejects a bad email', () => {
  assert.deepEqual(mergeCollected({ name: 'Ana', email: 'ana@a.com' }, { email: 'no tengo', company: 'B' }), {
    name: 'Ana',
    email: 'ana@a.com',
    company: 'B',
  })
  assert.equal(mergeCollected({}, { email: 'ANA@A.COM' }).email, 'ana@a.com')
})
