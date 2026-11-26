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
      label: 'Formas de pago de las propuestas',
      admin: {
        description:
          'Con esto se calculan la cuota, el precio por transferencia y lo que reciben ustedes en cada informe. El precio de lista de cada servicio es el de 3 cuotas sin interés.',
      },
      fields: [
        {
          type: 'row',
          fields: [
        {
          name: 'payTransferDiscount',
          type: 'number',
          label: 'Descuento por transferencia (%)',
          defaultValue: 10,
          min: 0,
          max: 100,
          admin: { width: '33%', step: 0.01 },
        },
        {
          name: 'paySixSurcharge',
          type: 'number',
          label: 'Recargo de 6 cuotas (%)',
          defaultValue: 13,
          min: 0,
          max: 100,
          admin: { width: '33%', step: 0.01, description: 'Sobre el precio de lista.' },
        },
          ],
        },
        {
          type: 'row',
          fields: [
        {
          name: 'mpFeeCharge',
          type: 'number',
          label: 'Mercado Pago: costo por cobro (%)',
          defaultValue: 1.53,
          min: 0,
          max: 100,
          admin: { width: '33%', step: 0.01, description: 'Sin IVA, como lo muestra Mercado Pago.' },
        },
        {
          name: 'mpFeeThree',
          type: 'number',
          label: 'Mercado Pago: costo de 3 cuotas (%)',
          defaultValue: 10.49,
          min: 0,
          max: 100,
          admin: { width: '33%', step: 0.01 },
        },
        {
          name: 'mpFeeSix',
          type: 'number',
          label: 'Mercado Pago: costo de 6 cuotas (%)',
          defaultValue: 18.69,
          min: 0,
          max: 100,
          admin: { width: '33%', step: 0.01 },
        },
          ],
        },
        { name: 'mpVat', type: 'number', label: 'IVA sobre las comisiones (%)', defaultValue: 21, min: 0, max: 100, admin: { width: '33%' } },
      ],
    },
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
      label: 'Respuestas automáticas de Instagram',
      fields: [
        {
          name: 'instagramLoginUrl',
          type: 'text',
          label: 'URL de inicio de sesión de la configuración',
          admin: {
            description:
              'La genera Meta for Developers → la app de Exacta → Instagram → "API setup with Unified login", después de crear la configuración y guardar la URL de redireccionamiento. Pegala entera.',
          },
          validate: (value: string | null | undefined) =>
            !value || /[?&]config_id=\d+/.test(value) || 'Tiene que ser la URL entera que genera Meta, con "config_id=" adentro.',
        },
        {
          name: 'instagramAccountIds',
          type: 'text',
          label: 'Identificador de las cuentas de Instagram',
          admin: {
            description:
              'Por si Meta no informa la cuenta al conectar. Está en Configuración del negocio → Cuentas de Instagram → Identificador (empieza con 1784). Si son varias, separalas con coma.',
          },
          validate: (value: string | null | undefined) =>
            !value || /^\s*\d{10,25}(\s*,\s*\d{10,25})*\s*$/.test(value) || 'Solo números, separados por coma.',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Motor de contenidos',
      fields: [
        {
          name: 'contentThemes',
          type: 'textarea',
          label: 'Temáticas',
          defaultValue: 'Transformación digital, desarrollo de software e IA aplicada a empresas.',
        },
        {
          name: 'contentPriorities',
          type: 'textarea',
          label: 'Qué queremos vender primero',
          admin: { description: 'El motor prioriza los temas que puedan generar negocios en estos servicios.' },
          defaultValue:
            '1. Software a medida\n2. Automatización e IA\n3. Sistema de reserva de turnos y notificaciones automáticas\n4. Agentes de IA',
        },
        {
          name: 'contentReader',
          type: 'textarea',
          label: 'Lector objetivo',
          defaultValue: 'Mandos medios y gerentes de empresas hispanohablantes de Latinoamérica.',
        },
        {
          name: 'gscSiteUrl',
          type: 'text',
          label: 'Propiedad de Search Console',
          admin: { description: 'Tal como figura en Search Console: sc-domain:tusitio.com o https://tusitio.com/' },
        },
        {
          name: 'ga4PropertyId',
          type: 'text',
          label: 'ID de propiedad de Google Analytics',
          admin: { description: 'El número que figura en Administrar → Detalles de la propiedad. No es el G-XXXXXXX.' },
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
