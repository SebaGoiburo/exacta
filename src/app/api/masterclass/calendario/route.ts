import { getPayload } from 'payload'
import config from '@payload-config'
import { icsFile } from '@/lib/masterclass/model'
import { classInfo, enrollmentByToken } from '@/lib/masterclass/service'

/** The class as a calendar file, for whoever doesn't use Google Calendar. Only with the buyer's private link. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('e') ?? ''
  const payload = await getPayload({ config })
  const enrollment = await enrollmentByToken(payload, token)
  if (!enrollment || enrollment.status !== 'pagada' || typeof enrollment.masterclass !== 'object') {
    return new Response('No encontramos tu inscripción.', { status: 404 })
  }
  const m = enrollment.masterclass
  const info = classInfo(m, token)
  const body = icsFile({
    uid: `masterclass-${m.id}@exactatransformaciondigital.com`,
    title: m.title,
    startsAt: m.startsAt,
    durationMin: info.durationMin,
    description: m.meetUrl ? `Enlace de la clase: ${m.meetUrl}` : 'El enlace de Google Meet te llega por mail el día anterior.',
    url: m.meetUrl ?? undefined,
  })
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="masterclass-ia-para-humanos.ics"',
      'cache-control': 'no-store',
    },
  })
}
