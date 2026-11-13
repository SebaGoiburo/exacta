import { googleToken } from '@/lib/google-auth'

/*
 * Voice notes to text with Google Speech-to-Text (v1, without data logging). WhatsApp sends voice
 * notes as Ogg Opus; its header says the length, so anything over the limit is refused before
 * Google is called and nothing is paid for it.
 */

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
const API = 'https://speech.googleapis.com/v1'
export const MAX_AUDIO_SECONDS = 180
/** Google's synchronous recognition only takes up to a minute. */
const SYNC_LIMIT_SECONDS = 55
const POLL_MS = 2000
const POLL_LIMIT_MS = 90_000
const OPUS_RATES = [8000, 12000, 16000, 24000, 48000]

export type Transcription =
  | { ok: true; text: string; seconds: number | null }
  | { ok: false; reason: 'too_long' | 'unsupported' | 'empty' | 'failed'; seconds: number | null }

/** Length and recording rate of an Ogg Opus file, read from its pages. Exported for tests. */
export function opusInfo(audio: Buffer): { seconds: number | null; rate: number } {
  const head = audio.indexOf('OpusHead')
  if (head < 0) return { seconds: null, rate: 48000 }
  const preSkip = audio.readUInt16LE(head + 10)
  const input = audio.readUInt32LE(head + 12)
  const rate = OPUS_RATES.includes(input) ? input : 48000
  // The last page's granule position counts 48 kHz samples from the start.
  const last = audio.lastIndexOf('OggS')
  if (last < 0 || last + 14 > audio.length) return { seconds: null, rate }
  const granule = Number(audio.readBigUInt64LE(last + 6))
  const seconds = granule > preSkip ? (granule - preSkip) / 48000 : null
  // A stray "OggS" inside the audio data would give an absurd length: then it counts as unknown.
  return { seconds: seconds === null || seconds > 7200 ? null : Math.round(seconds), rate }
}

function configFor(mimeType: string, audio: Buffer) {
  const type = mimeType.toLowerCase()
  if (type.includes('ogg') || type.includes('opus')) {
    const info = opusInfo(audio)
    return { seconds: info.seconds, config: { encoding: 'OGG_OPUS', sampleRateHertz: info.rate } }
  }
  if (type.includes('amr-wb')) return { seconds: null, config: { encoding: 'AMR_WB', sampleRateHertz: 16000 } }
  if (type.includes('amr')) return { seconds: null, config: { encoding: 'AMR', sampleRateHertz: 8000 } }
  return null
}

type Result = { results?: { alternatives?: { transcript?: string }[] }[] }

const joinText = (r: Result) =>
  (r.results ?? [])
    .map((x) => x.alternatives?.[0]?.transcript?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .trim()

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${await googleToken(SCOPE)}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`speech ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()) as T
}

export async function transcribe(audio: Buffer, mimeType: string): Promise<Transcription> {
  const setup = configFor(mimeType, audio)
  if (!setup) return { ok: false, reason: 'unsupported', seconds: null }
  const { seconds } = setup
  if (seconds !== null && seconds > MAX_AUDIO_SECONDS) return { ok: false, reason: 'too_long', seconds }

  const body = {
    config: { ...setup.config, languageCode: 'es-AR', enableAutomaticPunctuation: true },
    audio: { content: audio.toString('base64') },
  }
  try {
    let result: Result
    if (seconds !== null && seconds <= SYNC_LIMIT_SECONDS) {
      result = await call<Result>('/speech:recognize', body)
    } else {
      // Longer, or of unknown length: Google works on it and we ask until it's done.
      const operation = await call<{ name: string }>('/speech:longrunningrecognize', body)
      const started = Date.now()
      let done: { done?: boolean; response?: Result; error?: { message?: string } } = {}
      while (!done.done && Date.now() - started < POLL_LIMIT_MS) {
        await new Promise((r) => setTimeout(r, POLL_MS))
        done = await call(`/operations/${operation.name}`)
      }
      if (!done.done || done.error) throw new Error(done.error?.message ?? 'speech timeout')
      result = done.response ?? {}
    }
    const text = joinText(result)
    return text ? { ok: true, text, seconds } : { ok: false, reason: 'empty', seconds }
  } catch (err) {
    console.error('[whatsapp] transcription failed', err)
    return { ok: false, reason: 'failed', seconds }
  }
}
