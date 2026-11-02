import assert from 'node:assert/strict'
import { test } from 'node:test'
import { QUESTIONS } from '../src/lib/diagnostic/questions'
import { invalidAnswers, scoreDiagnostic, type Answers } from '../src/lib/diagnostic/scoring'

/** Answers every question with its first option, then applies overrides. */
const answers = (overrides: Answers = {}): Answers => ({
  ...Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options[0].id])),
  ...overrides,
})

const maturityAt = (id: string) =>
  Object.fromEntries(QUESTIONS.filter((q) => q.area).map((q) => [q.id, id]))

test('reports missing and unknown answers', () => {
  const { size: _omitted, ...rest } = answers()
  assert.deepEqual(invalidAnswers(rest), ['size'])
  assert.deepEqual(invalidAnswers(answers({ role: 'nope' })), ['role'])
  assert.deepEqual(invalidAnswers(answers()), [])
})

test('maturity spans 0 to 100 and each area is averaged', () => {
  assert.equal(scoreDiagnostic(answers(maturityAt('l0'))).maturity, 0)
  const top = scoreDiagnostic(answers(maturityAt('l3')))
  assert.equal(top.maturity, 100)
  assert.equal(top.areas.processes, 100)
  const mixed = scoreDiagnostic(answers({ 'processes-tasks': 'l0', 'processes-time': 'l3' }))
  assert.equal(mixed.areas.processes, 50)
})

test('a large company with budget and urgency is tier A', () => {
  const r = scoreDiagnostic(answers({ size: 'l', role: 'owner', budget: 'high', urgency: 'now' }), 'ana@empresa.com')
  assert.equal(r.fit, 91)
  assert.equal(r.tier, 'A')
})

test('the maximum profile reaches exactly 100', () => {
  const r = scoreDiagnostic(answers({ size: 'xl', role: 'owner', budget: 'top', urgency: 'now' }), 'ana@empresa.com')
  assert.equal(r.fit, 100)
})

test('a mid company still undecided on budget is tier B', () => {
  const r = scoreDiagnostic(answers({ size: 's', role: 'manager', budget: 'unknown', urgency: 'soon' }), 'ana@empresa.com')
  assert.equal(r.fit, 43)
  assert.equal(r.tier, 'B')
})

test('a very small exploring company is tier C', () => {
  const r = scoreDiagnostic(answers({ size: 'xs', role: 'owner', budget: 'unknown', urgency: 'exploring' }), 'ana@empresa.com')
  assert.equal(r.tier, 'C')
})

test('a budget below the minimum is tier C for any company', () => {
  const r = scoreDiagnostic(answers({ size: 'xl', role: 'owner', budget: 'low', urgency: 'now' }), 'ana@empresa.com')
  assert.equal(r.fit, 65)
  assert.equal(r.tier, 'C')
})

test('a free email lowers fit, but never below zero', () => {
  const profile = { size: 'm', role: 'owner', budget: 'mid', urgency: 'later' }
  assert.equal(scoreDiagnostic(answers(profile), 'ana@empresa.com').fit, 56)
  assert.equal(scoreDiagnostic(answers(profile), 'ana@gmail.com').fit, 51)
  assert.equal(scoreDiagnostic(answers({ size: 'xs', role: 'other', budget: 'low', urgency: 'exploring' }), 'a@gmail.com').fit, 0)
})
