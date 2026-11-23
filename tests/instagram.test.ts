import { createHmac } from 'node:crypto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  instagramLeadRef,
  linkWithRef,
  loginUrlParts,
  matchKeyword,
  normalizeKeyword,
  replyText,
  validSignature,
} from '../src/lib/instagram/keywords'

const KEYWORDS = [{ keyword: 'TURNOS' }, { keyword: 'IA' }, { keyword: 'IA PARA PYMES' }, { keyword: 'AUTOMATIZAR' }]

test('keywords are stored uppercase, without accents or punctuation', () => {
  assert.equal(normalizeKeyword('  automatizá! '), 'AUTOMATIZA')
  assert.equal(normalizeKeyword('ia para pymes'), 'IA PARA PYMES')
})

test('a comment matches a keyword only as a whole word', () => {
  assert.equal(matchKeyword('Turnos!!', KEYWORDS)?.keyword, 'TURNOS')
  assert.equal(matchKeyword('quiero info de turnos 🙌', KEYWORDS)?.keyword, 'TURNOS')
  assert.equal(matchKeyword('retornos', KEYWORDS), null)
  assert.equal(matchKeyword('qué buena idea, gracias', KEYWORDS), null)
  assert.equal(matchKeyword('ia', KEYWORDS)?.keyword, 'IA')
  assert.equal(matchKeyword('Me interesa la IA para pymes', KEYWORDS)?.keyword, 'IA PARA PYMES')
  assert.equal(matchKeyword('', KEYWORDS), null)
})

test('our own links carry the opportunity; other links only the campaign', () => {
  const site = 'https://exactatransformaciondigital.com'
  const own = new URL(linkWithRef(`${site}/diagnostico`, { keyword: 'IA', leadId: 42, siteUrl: site }))
  assert.equal(own.searchParams.get('utm_source'), 'instagram')
  assert.equal(own.searchParams.get('utm_campaign'), 'ia')
  assert.equal(own.searchParams.get('utm_content'), 'ig-42')
  assert.equal(instagramLeadRef(own.searchParams.get('utm_content')), 42)

  const other = new URL(linkWithRef('https://drive.google.com/file/x', { keyword: 'IA', leadId: 42, siteUrl: site }))
  assert.equal(other.searchParams.get('utm_content'), null)
  assert.equal(linkWithRef('no es un enlace', { keyword: 'IA', siteUrl: site }), 'no es un enlace')
})

test('only ig-<number> points to an opportunity', () => {
  assert.equal(instagramLeadRef('ig-7'), 7)
  assert.equal(instagramLeadRef('@exacta_agencia'), null)
  assert.equal(instagramLeadRef('ig-7; drop'), null)
  assert.equal(instagramLeadRef(undefined), null)
})

test('the private message ends with the link and fits Instagram', () => {
  assert.equal(replyText(' Hola ', 'https://x.com'), 'Hola\n\nhttps://x.com')
  assert.equal(replyText('Hola', null), 'Hola')
  assert.equal(replyText('a'.repeat(1200)).length, 1000)
})

test("Meta's signature is accepted with either secret", () => {
  const body = '{"object":"instagram","entry":[]}'
  const sign = (secret: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
  assert.equal(validSignature(body, sign('instagram'), ['instagram', 'meta']), true)
  assert.equal(validSignature(body, sign('meta'), ['instagram', 'meta']), true)
  assert.equal(validSignature(body, sign('otro'), ['instagram', 'meta']), false)
  assert.equal(validSignature(body, sign(''), ['', '']), false)
  assert.equal(validSignature(body, null, ['instagram']), false)
})

test('the app and configuration come from the sign-in URL Meta generates', () => {
  assert.deepEqual(
    loginUrlParts(
      ' https://www.facebook.com/v24.0/dialog/oauth?client_id=886929724445736&config_id=1234567890123&redirect_uri=https%3A%2F%2Fx.com&response_type=code ',
    ),
    { appId: '886929724445736', configId: '1234567890123' },
  )
  assert.deepEqual(loginUrlParts('1234567890123'), { appId: '', configId: '' })
  assert.deepEqual(loginUrlParts('https://x.com/?client_id=abc&config_id=1'), { appId: '', configId: '' })
})
