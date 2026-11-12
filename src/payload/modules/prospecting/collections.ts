import type { CollectionConfig, Field } from 'payload'
import { isAdmin, isAuthenticated, isPersonAccess } from '../../access'
import { DIMENSIONS, DIMENSION_NAMES } from '@/lib/prospecting/model'

/*
 * The prospect generator. An offer profile says what proves the need and how much each criterion
 * weighs; a batch runs one profile on one niche and zone; prospects are the companies it found.
 * Google only allows storing the place ID, so names and phones are always requested live.
 */

const crmAccess = { read: isAuthenticated, create: isAuthenticated, update: isAuthenticated, delete: isAuthenticated }

const AREA_OPTIONS = [
  { label: 'Procesos', value: 'processes' },
  { label: 'Sistemas', value: 'systems' },
  { label: 'Datos', value: 'data' },
  { label: 'Clientes', value: 'customers' },
  { label: 'IA', value: 'ai' },
]

/** Checked on the last weight, which sees the whole group: the six must add up to exactly 100. */
const weightsAddUp = (_: unknown, { siblingData }: { siblingData: Record<string, unknown> }) => {
  const sum = DIMENSIONS.reduce((total, d) => total + (Number(siblingData?.[d]) || 0), 0)
  return sum === 100 || `Los pesos tienen que sumar 100 (ahora suman ${sum}).`
}

const weightFields: Field[] = DIMENSIONS.map((d, i) => ({
  name: d,
  type: 'number',
  label: DIMENSION_NAMES[d],
  required: true,
  min: 0,
  max: 100,
  admin: { width: '33%' },
  ...(i === DIMENSIONS.length - 1 ? { validate: weightsAddUp } : {}),
}))

export const OfferProfiles: CollectionConfig = {
  slug: 'offer-profiles',
  labels: { singular: 'Perfil de oferta', plural: 'Perfiles de oferta' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'origin', 'updatedAt'],
    group: 'Marketing',
    description: 'Qué señales prueban la necesidad de cada oferta y cuánto pesa cada criterio. Los pesos suman 100.',
  },
  access: { read: isAuthenticated, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: 'name',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Oferta', required: true },
        { name: 'key', type: 'text', label: 'Clave', required: true, unique: true, index: true, admin: { width: '30%' } },
      ],
    },
    { name: 'description', type: 'textarea', label: 'Qué ofrecemos', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          label: 'Estado',
          required: true,
          defaultValue: 'borrador',
          options: [
            { label: 'Borrador: falta aprobarlo', value: 'borrador' },
            { label: 'Aprobado', value: 'aprobado' },
          ],
        },
        {
          name: 'origin',
          type: 'select',
          label: 'Origen',
          defaultValue: 'inicial',
          options: [
            { label: 'Perfil inicial', value: 'inicial' },
            { label: 'Texto libre (propuesto por la IA)', value: 'texto_libre' },
          ],
        },
        { name: 'parent', type: 'relationship', relationTo: 'offer-profiles', label: 'Variante de' },
      ],
    },
    { name: 'weights', type: 'group', label: 'Pesos (suman 100)', fields: [{ type: 'row', fields: weightFields }] },
    {
      name: 'minCapacity',
      type: 'number',
      label: 'Capacidad de compra mínima (0 a 100)',
      required: true,
      defaultValue: 30,
      min: 0,
      max: 100,
    },
    {
      name: 'signals',
      type: 'array',
      label: 'Señales de necesidad',
      labels: { singular: 'Señal', plural: 'Señales' },
      admin: {
        description:
          'Las claves automáticas se detectan sin IA (no_website, no_booking, slow_mobile…). Las que empiezan con "ia:" las evalúa la IA con reseñas y búsquedas.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'key', type: 'text', label: 'Clave', required: true, admin: { width: '25%' } },
            { name: 'label', type: 'text', label: 'Qué muestra', required: true },
            { name: 'weight', type: 'number', label: 'Puntos', required: true, min: 0, admin: { width: '12%' } },
            { name: 'area', type: 'select', label: 'Área', required: true, options: AREA_OPTIONS, admin: { width: '18%' } },
          ],
        },
      ],
    },
    { name: 'proof', type: 'textarea', label: 'Nuestra prueba: casos, productos y páginas que se pueden citar' },
    { name: 'costFormula', type: 'textarea', label: 'Cómo estimar el costo del problema (fórmula para el prospecto)' },
    { name: 'approvedBy', type: 'relationship', relationTo: 'users', label: 'Aprobado por', admin: { position: 'sidebar', readOnly: true } },
    { name: 'approvedAt', type: 'date', label: 'Aprobado el', admin: { position: 'sidebar', readOnly: true } },
  ],
}

export const ProspectBatches: CollectionConfig = {
  slug: 'prospect-batches',
  labels: { singular: 'Tanda', plural: 'Tandas' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'kept', 'aiCostUsd', 'createdAt'],
    group: 'Marketing',
    hidden: true,
  },
  access: { read: isPersonAccess, create: isAdmin, update: isAuthenticated, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    { name: 'title', type: 'text', label: 'Tanda', required: true },
    { name: 'profile', type: 'relationship', relationTo: 'offer-profiles', label: 'Oferta', required: true },
    { name: 'niche', type: 'text', label: 'Nicho', required: true },
    { name: 'zone', type: 'text', label: 'Zona', required: true },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'buscando',
      index: true,
      options: [
        { label: 'Buscando y midiendo', value: 'buscando' },
        { label: 'Primera pasada lista', value: 'puntuada' },
        { label: 'Investigando con IA', value: 'investigando' },
        { label: 'Lista', value: 'lista' },
        { label: 'Falló', value: 'fallo' },
      ],
    },
    { name: 'progress', type: 'text', label: 'Avance' },
    { name: 'found', type: 'number', label: 'Comercios encontrados', defaultValue: 0 },
    { name: 'knockedOut', type: 'number', label: 'Descartados por filtros', defaultValue: 0 },
    { name: 'kept', type: 'number', label: 'Prospectos de la tanda', defaultValue: 0 },
    { name: 'placesCalls', type: 'number', label: 'Consultas a Google Maps', defaultValue: 0 },
    { name: 'aiCostUsd', type: 'number', label: 'Costo de IA (US$)', defaultValue: 0 },
    { name: 'error', type: 'text', label: 'Error' },
    { name: 'startedBy', type: 'relationship', relationTo: 'users', label: 'Iniciada por' },
    { name: 'finishedAt', type: 'date', label: 'Terminada' },
  ],
}

/** One AI run for the generator: researching a prospect or drafting a free-text profile. */
export const ProspectJobs: CollectionConfig = {
  slug: 'prospect-jobs',
  labels: { singular: 'Investigación', plural: 'Investigaciones' },
  admin: { group: 'Marketing', hidden: true },
  access: { read: isPersonAccess, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Investigar prospecto', value: 'research' },
        { label: 'Proponer perfil de oferta', value: 'profile' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      index: true,
      options: [
        { label: 'En espera', value: 'queued' },
        { label: 'En curso', value: 'running' },
        { label: 'Terminada', value: 'done' },
        { label: 'Falló', value: 'failed' },
      ],
    },
    { name: 'prospect', type: 'relationship', relationTo: 'prospects', index: true },
    { name: 'batch', type: 'relationship', relationTo: 'prospect-batches', index: true },
    { name: 'offerText', type: 'textarea' },
    { name: 'request', type: 'json' },
    { name: 'sourcesSeen', type: 'json' },
    { name: 'continuations', type: 'number', defaultValue: 0 },
    { name: 'startedAt', type: 'date' },
    { name: 'costUsd', type: 'number', defaultValue: 0 },
    { name: 'error', type: 'text' },
  ],
}

export const Prospects: CollectionConfig = {
  slug: 'prospects',
  labels: { singular: 'Prospecto', plural: 'Prospectos' },
  admin: {
    useAsTitle: 'placeId',
    defaultColumns: ['niche', 'zone', 'status', 'score', 'tier', 'createdAt'],
    group: 'Marketing',
    description: 'Se buscan y gestionan desde Prospección. El contacto siempre lo hace una persona.',
  },
  access: crmAccess,
  defaultSort: '-createdAt',
  fields: [
    { name: 'placeId', type: 'text', label: 'ID de Google', required: true, unique: true, index: true, admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'niche', type: 'text', label: 'Nicho' },
        { name: 'zone', type: 'text', label: 'Zona' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      defaultValue: 'pendiente',
      required: true,
      index: true,
      options: [
        { label: 'Candidato', value: 'pendiente' },
        { label: 'Elegido', value: 'elegido' },
        { label: 'Informe listo', value: 'informe' },
        { label: 'Contactado', value: 'contactado' },
        { label: 'Respondió (en el CRM)', value: 'interesado' },
        { label: 'Descartado', value: 'descartado' },
      ],
    },
    { name: 'notes', type: 'textarea', label: 'Notas' },
    { name: 'lead', type: 'relationship', relationTo: 'leads', label: 'Oportunidad' },
    { name: 'diagnostic', type: 'relationship', relationTo: 'diagnostics', label: 'Diagnóstico que completó' },
    {
      type: 'collapsible',
      label: 'Puntaje',
      admin: { initCollapsed: true },
      fields: [
        { name: 'batch', type: 'relationship', relationTo: 'prospect-batches', label: 'Tanda', index: true },
        { name: 'profile', type: 'relationship', relationTo: 'offer-profiles', label: 'Oferta' },
        {
          type: 'row',
          fields: [
            { name: 'score', type: 'number', label: 'Puntaje (0 a 100)', index: true },
            {
              name: 'tier',
              type: 'select',
              label: 'Grupo',
              options: [
                { label: 'A', value: 'A' },
                { label: 'B', value: 'B' },
                { label: 'C', value: 'C' },
              ],
            },
            { name: 'pass', type: 'number', label: 'Pasada (1 automática, 2 con IA)' },
            { name: 'missing', type: 'number', label: 'Criterios sin datos' },
          ],
        },
        { name: 'shortlisted', type: 'checkbox', label: 'Entre los mejores de la tanda', index: true },
        { name: 'scores', type: 'json', label: 'Puntaje por criterio' },
        { name: 'knockouts', type: 'json', label: 'Filtros que lo descartan' },
        { name: 'facts', type: 'json', label: 'Lo que medimos (sitio, velocidad, puesto en Maps)' },
        { name: 'research', type: 'json', label: 'Investigación con IA' },
        { name: 'hook', type: 'textarea', label: 'Hallazgo para el primer contacto' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Informe',
      admin: { initCollapsed: true },
      fields: [
        { name: 'report', type: 'json', label: 'Contenido del informe' },
        { name: 'reportToken', type: 'text', label: 'Código del informe', unique: true, index: true, admin: { readOnly: true } },
        {
          type: 'row',
          fields: [
            { name: 'reportReviewedAt', type: 'date', label: 'Revisado' },
            { name: 'reportExpiresAt', type: 'date', label: 'Vence' },
            { name: 'reportSentAt', type: 'date', label: 'Enviado' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'reportOpenedAt', type: 'date', label: 'Primera apertura' },
            { name: 'reportLastOpenedAt', type: 'date', label: 'Última apertura', index: true },
            { name: 'reportOpens', type: 'number', label: 'Aperturas', defaultValue: 0 },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Contacto',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'attempts',
          type: 'array',
          label: 'Intentos de contacto',
          labels: { singular: 'Intento', plural: 'Intentos' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'date', type: 'date', label: 'Fecha', required: true },
                {
                  name: 'channel',
                  type: 'select',
                  label: 'Canal',
                  required: true,
                  options: [
                    { label: 'Llamada', value: 'llamada' },
                    { label: 'WhatsApp', value: 'whatsapp' },
                    { label: 'Email', value: 'email' },
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'Visita', value: 'visita' },
                  ],
                },
                {
                  name: 'result',
                  type: 'select',
                  label: 'Resultado',
                  required: true,
                  options: [
                    { label: 'Enviado', value: 'enviado' },
                    { label: 'No atendió', value: 'no_atendio' },
                    { label: 'Habló', value: 'hablo' },
                    { label: 'No le interesa', value: 'rechazo' },
                  ],
                },
              ],
            },
            { name: 'note', type: 'text', label: 'Nota' },
            { name: 'by', type: 'relationship', relationTo: 'users', label: 'Quién' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'nextAttemptAt', type: 'date', label: 'Próximo intento', index: true },
            { name: 'blockedUntil', type: 'date', label: 'No contactar hasta', index: true },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'outcome',
              type: 'select',
              label: 'Resultado final',
              options: [
                { label: 'Reunión', value: 'reunion' },
                { label: 'Ganado', value: 'ganado' },
                { label: 'Perdido', value: 'perdido' },
                { label: 'Sin respuesta', value: 'sin_respuesta' },
                { label: 'No le interesa', value: 'rechazo' },
              ],
            },
            { name: 'outcomeAt', type: 'date', label: 'Fecha del resultado' },
          ],
        },
      ],
    },
  ],
}
