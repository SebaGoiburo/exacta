import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access'

/** One row per call to Claude, with its tokens and cost. Written by the site only; read on the dashboard. */
export const AiUsage: CollectionConfig = {
  slug: 'ai-usage',
  labels: { singular: 'Uso de IA', plural: 'Uso de IA' },
  admin: { group: 'Sistema', defaultColumns: ['createdAt', 'feature', 'model', 'costUsd'] },
  access: { read: isAdmin, create: () => false, update: () => false, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'feature',
      type: 'select',
      label: 'Para qué',
      required: true,
      index: true,
      options: [
        { label: 'Prospectos', value: 'prospectos' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Contenido', value: 'contenido' },
      ],
    },
    { name: 'model', type: 'text', label: 'Modelo' },
    { name: 'inputTokens', type: 'number', label: 'Tokens de entrada' },
    { name: 'outputTokens', type: 'number', label: 'Tokens de salida' },
    { name: 'cacheWriteTokens', type: 'number', label: 'Tokens escritos en caché' },
    { name: 'cacheReadTokens', type: 'number', label: 'Tokens leídos de caché' },
    { name: 'searches', type: 'number', label: 'Búsquedas web' },
    { name: 'batch', type: 'checkbox', label: 'Por lotes (mitad de precio)' },
    { name: 'costUsd', type: 'number', label: 'Costo (US$)' },
  ],
  timestamps: true,
}
