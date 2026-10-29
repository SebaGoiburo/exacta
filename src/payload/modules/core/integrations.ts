import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access'

/**
 * Accounts for systems (n8n, Odoo sync…) that use the API with a key and never sign in to the panel.
 * Requests authenticate with the header: Authorization: integrations API-Key <key>
 */
export const Integrations: CollectionConfig = {
  slug: 'integrations',
  labels: { singular: 'Integración', plural: 'Integraciones' },
  admin: {
    useAsTitle: 'name',
    group: 'Sistema',
    description:
      'Claves para que n8n u otros sistemas usen la API. Creá una integración, activá “Habilitar clave API” y copiá la clave en n8n.',
  },
  auth: { useAPIKey: true, disableLocalStrategy: true },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [{ name: 'name', type: 'text', label: 'Nombre', required: true }],
}
