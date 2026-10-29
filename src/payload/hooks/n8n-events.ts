import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { sendToN8n } from '@/lib/n8n'
import { isIntegration } from '../access'

/**
 * Emits `<collection>.created | .updated | .deleted` events to the n8n webhook.
 * Changes made by an integration account (n8n itself) are not echoed back, to avoid loops.
 * Delivery never blocks or fails the save; errors are logged.
 */
export const n8nEvents = (slug: string, extra?: (args: { doc: any; previousDoc: any }) => string[]) => {
  const emit = (event: string, data: unknown, log: { error: (o: object, m: string) => void }) => {
    const url = process.env.N8N_EVENTS_WEBHOOK_URL
    if (!url) return
    sendToN8n(url, event, data).catch((err) => log.error({ err }, `[n8n] ${event} not delivered`))
  }

  const afterChange: CollectionAfterChangeHook = ({ doc, previousDoc, operation, req, context }) => {
    if (context?.skipN8n || isIntegration(req)) return doc
    emit(`${slug}.${operation === 'create' ? 'created' : 'updated'}`, doc, req.payload.logger)
    if (operation === 'update' && extra) {
      for (const event of extra({ doc, previousDoc })) emit(`${slug}.${event}`, { doc, previousDoc }, req.payload.logger)
    }
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = ({ doc, req, context }) => {
    if (context?.skipN8n || isIntegration(req)) return doc
    emit(`${slug}.deleted`, doc, req.payload.logger)
    return doc
  }

  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}
