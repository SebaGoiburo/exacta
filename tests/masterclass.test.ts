import assert from 'node:assert/strict'
import { test } from 'node:test'
import { argDate, argIso, daysUntil, googleCalendarUrl, icsFile, normalizePhone, offer } from '../src/lib/masterclass/model'

const RULES = { capacity: 30, releasedSeats: 0, launchSeats: 10, launchPrice: 35000, price: 45000 }

test('the first ten seats go at the launch price, then the regular one', () => {
  const start = offer(RULES, { total: 0, launch: 0 })
  assert.equal(start.price, 35000)
  assert.equal(start.launchLeft, 10)
  assert.equal(start.nextPrice, 45000)
  assert.equal(start.left, 30)

  const nine = offer(RULES, { total: 9, launch: 9 })
  assert.equal(nine.launchLeft, 1)
  assert.equal(nine.price, 35000)

  const ten = offer(RULES, { total: 10, launch: 10 })
  assert.equal(ten.price, 45000)
  assert.equal(ten.tier, 'general')
  assert.equal(ten.nextPrice, null)
  assert.equal(ten.left, 20)
})

test('a full class is sold out until the team releases seats', () => {
  const full = offer(RULES, { total: 30, launch: 10 })
  assert.equal(full.soldOut, true)
  assert.equal(full.left, 0)

  const released = offer({ ...RULES, releasedSeats: 10 }, { total: 30, launch: 10 })
  assert.equal(released.soldOut, false)
  assert.equal(released.left, 10)
  assert.equal(released.total, 40)
  assert.equal(released.released, 10)
})

test('launch seats never exceed the seats left', () => {
  const o = offer({ ...RULES, capacity: 5 }, { total: 3, launch: 0 })
  assert.equal(o.launchLeft, 2)
})

test('dates are said the Argentine way, in Argentina', () => {
  const d = argDate('2026-12-09T22:00:00.000Z')
  assert.equal(d.long, 'miércoles 9 de diciembre')
  assert.equal(d.short, 'MIÉ 9/12')
  assert.equal(d.time, '19 h')
  assert.equal(argDate('2026-12-09T22:30:00.000Z').time, '19:30 h')
})

test('event dates carry the Argentine offset for search engines', () => {
  assert.equal(argIso('2026-12-11T22:00:00.000Z'), '2026-12-11T19:00:00-03:00')
  assert.equal(argIso('2026-12-11T22:00:00.000Z', 150), '2026-12-11T21:30:00-03:00')
})

test('days left count calendar days in Argentina', () => {
  assert.equal(daysUntil('2026-12-09T22:00:00.000Z', new Date('2026-11-26T15:00:00Z')), 13)
  // 23:30 in Argentina on the 8th is already the 9th in UTC: still one day.
  assert.equal(daysUntil('2026-12-09T22:00:00.000Z', new Date('2026-12-09T02:30:00Z')), 1)
  assert.equal(daysUntil('2026-12-09T22:00:00.000Z', new Date('2026-12-09T13:00:00Z')), 0)
})

test('Argentine WhatsApp numbers are normalized however they are written', () => {
  assert.equal(normalizePhone('261 555 1234'), '5492615551234')
  assert.equal(normalizePhone('0261 15 555 1234'), '5492615551234')
  assert.equal(normalizePhone('+54 9 261 555-1234'), '5492615551234')
  assert.equal(normalizePhone('11 4444 5555'), '5491144445555')
  assert.equal(normalizePhone('5555'), null)
})

test('calendar links and files carry the class time in UTC', () => {
  const url = new URL(
    googleCalendarUrl({ title: 'Masterclass', startsAt: '2026-12-09T22:00:00.000Z', durationMin: 150, details: 'x' }),
  )
  assert.equal(url.searchParams.get('dates'), '20261209T220000Z/20261210T003000Z')
  const ics = icsFile({
    uid: 'a@b',
    title: 'Clase, en vivo',
    startsAt: '2026-12-09T22:00:00.000Z',
    durationMin: 150,
    description: 'Línea 1\nLínea 2',
  })
  assert.match(ics, /DTSTART:20261209T220000Z/)
  assert.match(ics, /DTEND:20261210T003000Z/)
  assert.match(ics, /SUMMARY:Clase\\, en vivo/)
  assert.match(ics, /DESCRIPTION:Línea 1\\nLínea 2/)
})
