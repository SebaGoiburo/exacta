import type { CollectionAfterChangeHook } from 'payload'
import { BLOCK_DAYS } from '@/lib/prospecting/model'

const OUTCOME: Record<string, 'reunion' | 'ganado' | 'perdido'> = {
  diagnostico: 'reunion',
  propuesta: 'reunion',
  ganado: 'ganado',
  perdido: 'perdido',
}

/**
 * When an opportunity that came from prospecting moves on, its prospect records how it ended.
 * That pairing of scores and results is what recalibrates the weights later.
 */
export const syncProspectOutcome: CollectionAfterChangeHook = async ({ doc, previousDoc, req, operation }) => {
  if (operation !== 'update' || doc.stage === previousDoc?.stage) return doc
  const outcome = OUTCOME[doc.stage as string]
  if (!outcome) return doc
  try {
    const { docs } = await req.payload.find({
      collection: 'prospects',
      where: { lead: { equals: doc.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const prospect = docs[0]
    if (!prospect) return doc
    // A meeting never overwrites a final result.
    if (outcome === 'reunion' && (prospect.outcome === 'ganado' || prospect.outcome === 'perdido')) return doc
    await req.payload.update({
      collection: 'prospects',
      id: prospect.id,
      overrideAccess: true,
      req,
      data: {
        outcome,
        outcomeAt: new Date().toISOString(),
        ...(outcome === 'perdido' ? { blockedUntil: new Date(Date.now() + BLOCK_DAYS * 86400000).toISOString() } : {}),
      },
    })
  } catch (err) {
    req.payload.logger.error({ err }, '[prospecting] outcome not synced')
  }
  return doc
}
