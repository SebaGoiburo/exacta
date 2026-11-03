import { revalidateTag } from 'next/cache'
import type { GlobalConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../../access'
import { cmsTag } from '../../hooks/revalidate'

/** Marketing settings editable without a deploy. Empty IDs mean that tool stays off. */
export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Ajustes',
  admin: { group: 'Sistema' },
  access: { read: isAuthenticated, update: isAdmin },
  hooks: {
    afterChange: [
      ({ doc }) => {
        try {
          revalidateTag(cmsTag('settings'), 'max')
        } catch {
          // Outside a request (scripts, seed) there is no cache to invalidate.
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'bookingUrl',
      type: 'text',
      label: 'Enlace para agendar reuniones',
      admin: { description: 'Google Calendar o Cal.com. Si está vacío, el diagnóstico deriva a WhatsApp.' },
    },
    { name: 'leadNotifyEmail', type: 'email', label: 'Email que recibe los avisos de leads' },
    {
      type: 'collapsible',
      label: 'Agente de WhatsApp',
      fields: [
        {
          name: 'handoffPhone',
          type: 'text',
          label: 'WhatsApp que recibe las derivaciones',
          admin: { description: 'Con código de país y sin espacios, por ejemplo 5492610000000.' },
        },
        {
          name: 'handoffTemplate',
          type: 'text',
          label: 'Plantilla aprobada en Meta para el aviso',
          defaultValue: 'aviso_derivacion',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Píxeles y analítica',
      admin: { description: 'Se cargan solo si la persona acepta las cookies.' },
      fields: [
        { name: 'metaPixelId', type: 'text', label: 'Meta Pixel ID' },
        { name: 'ga4Id', type: 'text', label: 'Google Analytics 4 (G-XXXXXXX)' },
        { name: 'googleAdsId', type: 'text', label: 'Google Ads (AW-XXXXXXX)' },
        { name: 'googleAdsLeadLabel', type: 'text', label: 'Etiqueta de conversión de Google Ads para leads' },
      ],
    },
  ],
}
