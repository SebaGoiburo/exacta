import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeQueries, type SearchData } from '../src/lib/content-engine/google'
import {
  blogRequest,
  cleanTopic,
  describeData,
  ENGINE_MODEL,
  parseOutput,
  topicsRequest,
  urlsSeen,
  type EngineContext,
  type TopicOutput,
} from '../src/lib/content-engine/prompts'
import { shareLinks } from '../src/lib/share'

const noData: SearchData = { searchConsole: { status: 'not_connected' }, analytics: { status: 'not_connected' } }
const context: EngineContext = { themes: 'T', priorities: 'P', reader: 'R', offer: 'O', existing: ['Ya publicado'] }

const topic = (over: Partial<TopicOutput> = {}): TopicOutput => ({
  title: 'Tema',
  score: 80,
  service: 'Software a medida',
  reader: 'Gerente',
  problem: 'Problema',
  commercialReason: 'Razón',
  searchIntent: 'Comercial',
  keywords: ['a'],
  demand: 'alta',
  competition: 'Media',
  evidence: [],
  longVideo: { title: 'V', angle: 'A' },
  blogPosts: [{ title: 'B', angle: 'A', keyword: 'k' }],
  linkedin: ['L'],
  youtube: ['Y'],
  ...over,
})

test('a web source the search never returned is dropped', () => {
  const clean = cleanTopic(
    topic({
      evidence: [
        { source: 'web', claim: 'real', url: 'https://real.example/a' },
        { source: 'web', claim: 'inventada', url: 'https://inventada.example/b' },
      ],
    }),
    ['https://real.example/a'],
    noData,
  )
  assert.deepEqual(clean.evidence.map((e) => e.claim), ['real'])
  assert.equal(clean.demand, 'alta')
})

test('Google evidence is dropped when Google was not connected', () => {
  const clean = cleanTopic(topic({ evidence: [{ source: 'search_console', claim: '500 clics', url: '' }] }), [], noData)
  assert.deepEqual(clean.evidence, [])
})

test('with no evidence left, demand can not be claimed', () => {
  assert.equal(cleanTopic(topic({ demand: 'alta' }), [], noData).demand, 'sin_datos')
})

test('the score stays on its scale', () => {
  assert.equal(cleanTopic(topic({ score: 140 }), [], noData).score, 100)
  assert.equal(cleanTopic(topic({ score: -5 }), [], noData).score, 0)
})

test('without Google data the prompt says so', () => {
  const text = describeData(noData)
  assert.match(text, /SEARCH CONSOLE: sin datos/)
  assert.match(text, /GOOGLE ANALYTICS: sin datos/)
})

test('topic requests search the web, and writing requests do not', () => {
  const topics = topicsRequest(context, noData) as { model: string; tools?: unknown[]; messages: { content: string }[] }
  assert.equal(topics.model, ENGINE_MODEL)
  assert.ok(topics.tools?.length)
  assert.match(topics.messages[0].content, /Ya publicado/)
  assert.equal((blogRequest(context, topic()) as { tools?: unknown[] }).tools, undefined)
})

test('the pages a search returned are collected', () => {
  const response = {
    content: [
      { type: 'text', text: 'Busco' },
      { type: 'web_search_tool_result', content: [{ url: 'https://a.example' }, { url: 'https://b.example' }] },
      { type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error' } },
    ],
  }
  assert.deepEqual(urlsSeen(response), ['https://a.example', 'https://b.example'])
})

test('the JSON is read from the last text block', () => {
  const response = {
    stop_reason: 'end_turn',
    content: [
      { type: 'text', text: 'Voy a buscar.' },
      { type: 'text', text: '{"ok":true}' },
    ],
  }
  assert.deepEqual(parseOutput(response), { ok: true })
})

test('an answer that is cut off or refused is not used', () => {
  const content = [{ type: 'text', text: '{"ok":true}' }]
  assert.equal(parseOutput({ stop_reason: 'max_tokens', content }), null)
  assert.equal(parseOutput({ stop_reason: 'refusal', content }), null)
  assert.equal(parseOutput({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'no es JSON' }] }), null)
})

test('search queries are split into top, rising and within reach', () => {
  const row = (query: string, impressions: number, position: number) => ({ keys: [query], clicks: 1, impressions, position })
  const { top, rising, withinReach } = summarizeQueries(
    [row('crece', 100, 3), row('estable', 200, 2), row('alcance', 50, 12), row('poca', 2, 12)],
    [row('crece', 20, 3), row('estable', 190, 2), row('alcance', 45, 12)],
  )
  assert.equal(top[0].query, 'estable')
  assert.deepEqual(rising.map((r) => r.query), ['crece'])
  assert.deepEqual(withinReach.map((r) => r.query), ['alcance'])
})

test('share links carry the encoded address and title', () => {
  const links = shareLinks('https://x.com/blog/a?b=1', 'Hola & chau', 'Bajada')
  const by = Object.fromEntries(links.map((l) => [l.network, l.href]))
  assert.equal(links.length, 5)
  assert.ok(by.linkedin.includes(encodeURIComponent('https://x.com/blog/a?b=1')))
  assert.ok(by.x.includes('Hola%20%26%20chau'))
  assert.ok(by.email.startsWith('mailto:?subject=Hola%20%26%20chau&body=Bajada'))
})
